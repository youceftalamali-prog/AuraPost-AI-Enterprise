import {
  S3Client,
  S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl as presign } from "@aws-sdk/s3-request-presigner";
import {
  StorageProvider,
  StorageObjectMetadata,
  UploadOptions,
  SignedUrlOptions,
  StorageError,
} from "../StorageProvider";

/**
 * Amazon S3 storage provider. Also the base implementation reused (via
 * subclassing with a different endpoint/credentials) by the Cloudflare R2
 * and MinIO providers, since both speak the S3 API.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name: string = "s3";

  protected client: S3Client;
  protected bucket: string;

  constructor(options?: { bucket?: string; clientConfig?: S3ClientConfig; name?: string }) {
    this.bucket = options?.bucket ?? process.env.S3_BUCKET ?? "";
    if (!this.bucket) {
      throw new StorageError("S3_BUCKET is not configured", this.name, "constructor");
    }
    if (options?.name) this.name = options.name;

    this.client =
      options?.clientConfig !== undefined
        ? new S3Client(options.clientConfig)
        : new S3Client({
            region: process.env.S3_REGION ?? "us-east-1",
            credentials:
              process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
                ? {
                    accessKeyId: process.env.S3_ACCESS_KEY_ID,
                    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
                  }
                : undefined,
          });
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<StorageObjectMetadata> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ContentType: options?.contentType,
          CacheControl: options?.cacheControl,
          Metadata: options?.metadata,
          ACL: options?.public ? "public-read" : undefined,
        })
      );
      return { key, size: data.length, contentType: options?.contentType };
    } catch (err) {
      throw new StorageError("Failed to upload object", this.name, "upload", err);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) throw new Error("Empty response body");
      return Buffer.from(bytes);
    } catch (err) {
      throw new StorageError("Failed to download object", this.name, "download", err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      throw new StorageError("Failed to delete object", this.name, "delete", err);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const objects = await this.list(prefix, 1000);
      await Promise.all(objects.map((obj) => this.delete(obj.key)));
    } catch (err) {
      throw new StorageError("Failed to delete prefix", this.name, "deleteByPrefix", err);
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<StorageObjectMetadata> {
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${sourceKey}`,
          Key: destinationKey,
        })
      );
      await this.delete(sourceKey);
      return (await this.getMetadata(destinationKey)) ?? { key: destinationKey, size: 0 };
    } catch (err) {
      throw new StorageError("Failed to move object", this.name, "move", err);
    }
  }

  async rename(sourceKey: string, newKey: string): Promise<StorageObjectMetadata> {
    return this.move(sourceKey, newKey);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.getMetadata(key)) !== null;
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        key,
        size: head.ContentLength ?? 0,
        contentType: head.ContentType,
        etag: head.ETag,
        lastModified: head.LastModified,
      };
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") return null;
      throw new StorageError("Failed to fetch object metadata", this.name, "getMetadata", err);
    }
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    try {
      const command =
        options?.operation === "put"
          ? new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: options?.contentType })
          : new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await presign(this.client, command, { expiresIn: options?.expiresInSeconds ?? 3600 });
    } catch (err) {
      throw new StorageError("Failed to sign URL", this.name, "getSignedUrl", err);
    }
  }

  async list(prefix: string, maxKeys = 1000): Promise<StorageObjectMetadata[]> {
    try {
      const result = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: maxKeys })
      );
      return (result.Contents ?? []).map((obj) => ({
        key: obj.Key ?? "",
        size: obj.Size ?? 0,
        etag: obj.ETag,
        lastModified: obj.LastModified,
      }));
    } catch (err) {
      throw new StorageError("Failed to list objects", this.name, "list", err);
    }
  }
}
