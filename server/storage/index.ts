import { StorageProvider } from "./StorageProvider";

export type { StorageProvider, StorageObjectMetadata, UploadOptions, SignedUrlOptions } from "./StorageProvider";
export { StorageError } from "./StorageProvider";

export type StorageProviderName = "local" | "s3" | "r2" | "gcs" | "azure" | "minio";

let cachedProvider: StorageProvider | null = null;
let cachedProviderName: StorageProviderName | null = null;

/**
 * Returns the active StorageProvider, selected entirely from the
 * `STORAGE_PROVIDER` environment variable (default: "local"). This is the
 * ONLY function business logic (AssetUploadService, ProjectService, export
 * pipelines, etc.) should call to get a storage handle — never import a
 * provider class or vendor SDK directly.
 *
 * Providers are lazy-loaded (dynamic import) so a deployment only pulls in
 * the SDK it actually configured (e.g. a local-only dev box never loads
 * @aws-sdk/client-s3, @google-cloud/storage, or @azure/storage-blob).
 */
export async function getStorageProvider(): Promise<StorageProvider> {
  const configured = (process.env.STORAGE_PROVIDER || "local").toLowerCase() as StorageProviderName;

  if (cachedProvider && cachedProviderName === configured) {
    return cachedProvider;
  }

  switch (configured) {
    case "local": {
      const { LocalStorageProvider } = await import("./providers/LocalStorageProvider");
      cachedProvider = new LocalStorageProvider();
      break;
    }
    case "s3": {
      const { S3StorageProvider } = await import("./providers/S3StorageProvider");
      cachedProvider = new S3StorageProvider();
      break;
    }
    case "r2": {
      const { R2StorageProvider } = await import("./providers/R2StorageProvider");
      cachedProvider = new R2StorageProvider();
      break;
    }
    case "gcs": {
      const { GCSStorageProvider } = await import("./providers/GCSStorageProvider");
      cachedProvider = new GCSStorageProvider();
      break;
    }
    case "azure": {
      const { AzureBlobStorageProvider } = await import("./providers/AzureBlobStorageProvider");
      cachedProvider = new AzureBlobStorageProvider();
      break;
    }
    case "minio": {
      const { MinIOStorageProvider } = await import("./providers/MinIOStorageProvider");
      cachedProvider = new MinIOStorageProvider();
      break;
    }
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${configured}". Expected one of: local, s3, r2, gcs, azure, minio.`
      );
  }

  cachedProviderName = configured;
  return cachedProvider;
}

/** Test/script-only escape hatch to force re-resolution after changing env vars at runtime. */
export function resetStorageProviderCache(): void {
  cachedProvider = null;
  cachedProviderName = null;
}
