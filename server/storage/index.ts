import "server-only";
import { db, sql, type Tx } from "../db";
import { env } from "../env";
import { LocalStorage } from "./local";
import { S3Storage } from "./s3";
import type { StorageDriver } from "./types";

export { storageKeys } from "./keys";
export type { StorageDriver } from "./types";

let driver: StorageDriver | undefined;

export function storage(): StorageDriver {
  if (driver) return driver;
  const config = env();
  driver =
    config.STORAGE_DRIVER === "s3"
      ? new S3Storage({
          endpoint: config.STORAGE_ENDPOINT,
          region: config.STORAGE_REGION,
          bucket: config.STORAGE_BUCKET!,
          accessKeyId: config.STORAGE_ACCESS_KEY!,
          secretAccessKey: config.STORAGE_SECRET_KEY!,
          forcePathStyle: config.STORAGE_FORCE_PATH_STYLE,
        })
      : new LocalStorage(config.STORAGE_LOCAL_DIR);
  return driver;
}

/** URL signée (ou null) pour une clé optionnelle. */
export async function fileUrl(key: string | null | undefined, downloadName?: string): Promise<string | null> {
  if (!key) return null;
  return storage().signedUrl(key, downloadName ? { downloadName } : undefined);
}

/**
 * Programme la suppression de fichiers. À appeler dans la même transaction que la
 * suppression des données : si la suppression immédiate échoue, le worker réessaie.
 */
export async function queueFileDeletion(keys: (string | null | undefined)[], tx: Tx = db): Promise<void> {
  const unique = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  if (unique.length === 0) return;
  await tx.exec(sql`INSERT INTO pending_file_deletions (storage_key) SELECT unnest(${unique}::text[])`);
}

/** Supprime les fichiers en attente. Utilisé après une transaction et par le worker. */
export async function processFileDeletions(limit = 200): Promise<{ deleted: number; failed: number }> {
  const pending = await db.many<{ id: string; storageKey: string }>(sql`
    SELECT id, storage_key FROM pending_file_deletions
    WHERE attempts < 10 ORDER BY created_at ASC LIMIT ${limit}`);
  let deleted = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      await storage().delete(item.storageKey);
      await db.exec(sql`DELETE FROM pending_file_deletions WHERE id = ${item.id}`);
      deleted++;
    } catch (error) {
      failed++;
      await db.exec(sql`
        UPDATE pending_file_deletions
        SET attempts = attempts + 1, last_error = ${String(error).slice(0, 500)}
        WHERE id = ${item.id}`);
    }
  }
  return { deleted, failed };
}

/** Lance le traitement sans bloquer la réponse. */
export function flushFileDeletions(): void {
  processFileDeletions().catch((error) => console.error("[storage] suppression différée échouée", error));
}
