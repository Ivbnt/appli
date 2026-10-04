export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
};

export type SignedUrlOptions = {
  /** Nom de fichier proposé au téléchargement (Content-Disposition: attachment). */
  downloadName?: string;
};

export interface StorageDriver {
  readonly name: "local" | "s3";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  signedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
}
