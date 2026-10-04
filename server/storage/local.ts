import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { assertSafeKey } from "./keys";
import { signFileUrl } from "./signing";
import type { SignedUrlOptions, StorageDriver, StoredObject } from "./types";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  tiff: "image/tiff",
  pdf: "application/pdf",
};

/** Stockage sur disque, hors de /public : les fichiers ne sont servis que via /api/files avec une URL signée. */
export class LocalStorage implements StorageDriver {
  readonly name = "local" as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Chemin de stockage invalide");
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body, { mode: 0o600 });
  }

  async get(key: string): Promise<StoredObject | null> {
    const full = this.resolve(key);
    try {
      const info = await stat(full);
      if (!info.isFile()) return null;
      const ext = path.extname(full).slice(1).toLowerCase();
      return {
        body: Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>,
        contentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
        size: info.size,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async signedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
    assertSafeKey(key);
    return signFileUrl(key, options.downloadName);
  }
}
