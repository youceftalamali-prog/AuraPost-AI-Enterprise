import { Storage, Bucket } from "@google-cloud/storage";
import {
  StorageProvider,
  StorageObjectMetadata,
  UploadOptions,
  SignedUrlOptions,
  StorageError,
} from "../StorageProvider";

/**
 * Google Cloud Storage provider.
 *
 * Auth: standard GCS client resolution — `GCS_KEY_FILE` (path to a service
 * account JSON) if set, otherwise falls back to Application Default
 * Credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS or workload identity).
 */
export class GCSStorageProvider implements StorageProvider {
  readonly name = "gcs";

  private client: Storage;
  private bucket: Bucket;

  constructor() {
    const bucketName = process.env.GCS_BUCKET;
    if (!bucketName) {
      throw new StorageError("GCS_BUCKET is not configured", this.name, "constructor");
    }

    this.client = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEY_FILE || undefined,
    });
    this.bucket = this.client.bucket(bucketName);
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<StorageObjectMetadata> {
    try {
      const file = this.bucket.file(key);
      await file.save(data, {
        contentType: options?.contentType,
        metadata: {
          cacheControl: options?.cacheControl,
          metadata: options?.metadata,
        },
        public: options?.public ?? false,
      });
      return { key, size: data.length, contentType: options?.contentType };
    } catch (err) {
      throw new StorageError("Failed to upload object", this.name, "upload", err);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const [contents] = await this.bucket.file(key).download();
      return contents;
    } catch (err) {
      throw new StorageError("Failed to download object", this.name, "download", err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.bucket.file(key).delete({ ignoreNotFound: true });
    } catch (err) {
      throw new StorageError("Failed to delete object", this.name, "delete", err);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      await this.bucket.deleteFiles({ prefix });
    } catch (err) {
      throw new StorageError("Failed to delete prefix", this.name, "deleteByPrefix", err);
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<StorageObjectMetadata> {
    try {
      await this.bucket.file(sourceKey).move(destinationKey);
      return (await this.getMetadata(destinationKey)) ?? { key: destinationKey, size: 0 };
    } catch (err) {
      throw new StorageError("Failed to move object", this.name, "move", err);
    }
  }

  async rename(sourceKey: string, newKey: string): Promise<StorageObjectMetadata> {
    return this.move(sourceKey, newKey);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const [exists] = await this.bucket.file(key).exists();
      return exists;
    } catch (err) {
      throw new StorageError("Failed to check existence", this.name, "exists", err);
    }
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const [exists] = await this.bucket.file(key).exists();
      if (!exists) return null;
      const [meta] = await this.bucket.file(key).getMetadata();
      return {
        key,
        size: Number(meta.size ?? 0),
        contentType: meta.contentType,
        etag: meta.etag,
        lastModified: meta.updated ? new Date(meta.updated) : undefined,
      };
    } catch (err) {
      throw new StorageError("Failed to fetch object metadata", this.name, "getMetadata", err);
    }
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    try {
      const [url] = await this.bucket.file(key).getSignedUrl({
        action: options?.operation === "put" ? "write" : "read",
        expires: Date.now() + (options?.expiresInSeconds ?? 3600) * 1000,
        contentType: options?.contentType,
      });
      return url;
    } catch (err) {
      throw new StorageError("Failed to sign URL", this.name, "getSignedUrl", err);
    }
  }

  async list(prefix: string, maxKeys = 1000): Promise<StorageObjectMetadata[]> {
    try {
      const [files] = await this.bucket.getFiles({ prefix, maxResults: maxKeys });
      return files.map((f) => ({
        key: f.name,
        size: Number(f.metadata.size ?? 0),
        contentType: f.metadata.contentType,
        etag: f.metadata.etag,
        lastModified: f.metadata.updated ? new Date(f.metadata.updated) : undefined,
      }));
    } catch (err) {
      throw new StorageError("Failed to list objects", this.name, "list", err);
    }
  }
}
