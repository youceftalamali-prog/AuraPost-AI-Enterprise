import { S3StorageProvider } from "./S3StorageProvider";
import { StorageError } from "../StorageProvider";

/**
 * MinIO storage provider. MinIO is S3-API-compatible, so this configures
 * S3StorageProvider with a custom endpoint (self-hosted MinIO instance) and
 * path-style addressing, which MinIO requires (virtual-hosted-style URLs
 * don't resolve for arbitrary self-hosted domains).
 */
export class MinIOStorageProvider extends S3StorageProvider {
  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const bucket = process.env.MINIO_BUCKET;
    const accessKeyId = process.env.MINIO_ACCESS_KEY;
    const secretAccessKey = process.env.MINIO_SECRET_KEY;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new StorageError(
        "MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY and MINIO_SECRET_KEY are all required",
        "minio",
        "constructor"
      );
    }

    super({
      bucket,
      name: "minio",
      clientConfig: {
        region: process.env.MINIO_REGION ?? "us-east-1",
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      },
    });
  }
}
