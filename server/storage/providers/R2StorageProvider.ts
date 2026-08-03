import { S3StorageProvider } from "./S3StorageProvider";
import { StorageError } from "../StorageProvider";

/**
 * Cloudflare R2 storage provider. R2 exposes an S3-compatible API, so this
 * is a thin configuration of S3StorageProvider pointed at the account's R2
 * endpoint — kept as its own class (rather than folded into S3StorageProvider)
 * so `STORAGE_PROVIDER=r2` env selection and R2-specific env vars stay
 * self-contained and R2 can diverge later (e.g. R2 public dev URLs) without
 * touching the S3 provider.
 */
export class R2StorageProvider extends S3StorageProvider {
  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucket = process.env.R2_BUCKET;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      throw new StorageError(
        "R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are all required",
        "r2",
        "constructor"
      );
    }

    super({
      bucket,
      name: "r2",
      clientConfig: {
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      },
    });
  }
}
