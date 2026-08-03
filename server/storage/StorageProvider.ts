/**
 * Storage Abstraction Layer — StorageProvider contract.
 *
 * No business logic (AssetUploadService, ProjectService, exports, thumbnails,
 * previews, etc.) may import a vendor SDK (aws-sdk, @google-cloud/storage,
 * @azure/storage-blob, fs) directly. Everything goes through this interface,
 * obtained from `server/storage/index.ts` (`getStorageProvider()`), which
 * picks the concrete implementation entirely from environment variables.
 *
 * Every provider implementation must be functionally interchangeable: the
 * same call site works unmodified whether STORAGE_PROVIDER=local, s3, r2,
 * gcs, azure, or minio.
 */

export interface StorageObjectMetadata {
  /** Storage key / path, relative to the provider's root (bucket, container, or local root dir). */
  key: string;
  /** Size in bytes. */
  size: number;
  /** MIME type, if known. */
  contentType?: string;
  /** ETag / version marker, if the backend provides one. */
  etag?: string;
  /** Last-modified timestamp. */
  lastModified?: Date;
}

export interface UploadOptions {
  contentType?: string;
  /** Arbitrary key/value metadata to persist alongside the object, if the backend supports it. */
  metadata?: Record<string, string>;
  /** Cache-Control header to set on the stored object, where applicable. */
  cacheControl?: string;
  /** Whether the object should be publicly readable without a signed URL (default: false). */
  public?: boolean;
}

export interface SignedUrlOptions {
  /** Seconds until the signed URL expires. Default: 3600 (1 hour). */
  expiresInSeconds?: number;
  /** 'get' for downloads (default), 'put' for direct client uploads. */
  operation?: "get" | "put";
  /** Content type to bind to a 'put' signed URL, if the backend requires it. */
  contentType?: string;
}

export interface StorageProvider {
  /** Human-readable provider name, used only for logging/diagnostics — never branch business logic on this. */
  readonly name: string;

  /**
   * Upload a buffer/stream to `key`. Used for original uploads, generated
   * thumbnails, generated previews, and any other derived asset — there is
   * no separate "thumbnail" or "preview" method on the interface because
   * thumbnail/preview generation is image-processing (done by the caller,
   * e.g. via sharp), while *storing* the resulting bytes is always a plain
   * upload through this one method.
   */
  upload(key: string, data: Buffer, options?: UploadOptions): Promise<StorageObjectMetadata>;

  /** Download an object's full contents into memory. */
  download(key: string): Promise<Buffer>;

  /** Delete a single object. Must not throw if the key does not exist. */
  delete(key: string): Promise<void>;

  /** Delete every object under a key prefix (e.g. when deleting a whole project/asset folder). */
  deleteByPrefix(prefix: string): Promise<void>;

  /** Move/rename an object from one key to another (copy + delete for backends without a native move). */
  move(sourceKey: string, destinationKey: string): Promise<StorageObjectMetadata>;

  /** Convenience alias for `move` used by call sites that are renaming rather than relocating. */
  rename(sourceKey: string, newKey: string): Promise<StorageObjectMetadata>;

  /** Whether an object exists at `key`. */
  exists(key: string): Promise<boolean>;

  /** Fetch metadata for an object without downloading its body. */
  getMetadata(key: string): Promise<StorageObjectMetadata | null>;

  /**
   * Produce a time-limited URL for direct client GET or PUT. For providers
   * that always serve publicly (e.g. local dev static mount), this may
   * return a plain URL with a far-future expiry — callers must not assume
   * the URL is short-lived.
   */
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;

  /** List keys under a prefix (used by asset-folder browsing, migration, and cleanup scripts). */
  list(prefix: string, maxKeys?: number): Promise<StorageObjectMetadata[]>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(`[${provider}:${operation}] ${message}`);
    this.name = "StorageError";
  }
}
