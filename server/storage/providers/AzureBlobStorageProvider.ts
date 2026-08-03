import {
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";
import {
  StorageProvider,
  StorageObjectMetadata,
  UploadOptions,
  SignedUrlOptions,
  StorageError,
} from "../StorageProvider";

/**
 * Azure Blob Storage provider.
 *
 * Auth: `AZURE_STORAGE_CONNECTION_STRING` if set (simplest path), otherwise
 * `AZURE_STORAGE_ACCOUNT` + `AZURE_STORAGE_ACCOUNT_KEY` (used for SAS
 * signing directly, since a connection string doesn't expose the key that
 * `generateBlobSASQueryParameters` needs).
 */
export class AzureBlobStorageProvider implements StorageProvider {
  readonly name = "azure";

  private serviceClient: BlobServiceClient;
  private container: ContainerClient;
  private accountName?: string;
  private sharedKeyCredential?: StorageSharedKeyCredential;

  constructor() {
    const containerName = process.env.AZURE_STORAGE_CONTAINER;
    if (!containerName) {
      throw new StorageError("AZURE_STORAGE_CONTAINER is not configured", this.name, "constructor");
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (connectionString) {
      this.serviceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (accountName && accountKey) {
      this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.accountName = accountName;
      this.serviceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        this.sharedKeyCredential
      );
    } else {
      throw new StorageError(
        "Either AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT + AZURE_STORAGE_ACCOUNT_KEY must be set",
        this.name,
        "constructor"
      );
    }

    this.container = this.serviceClient.getContainerClient(containerName);
  }

  async upload(key: string, data: Buffer, options?: UploadOptions): Promise<StorageObjectMetadata> {
    try {
      const blockBlobClient = this.container.getBlockBlobClient(key);
      await blockBlobClient.upload(data, data.length, {
        blobHTTPHeaders: {
          blobContentType: options?.contentType,
          blobCacheControl: options?.cacheControl,
        },
        metadata: options?.metadata,
      });
      return { key, size: data.length, contentType: options?.contentType };
    } catch (err) {
      throw new StorageError("Failed to upload object", this.name, "upload", err);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const blockBlobClient = this.container.getBlockBlobClient(key);
      const download = await blockBlobClient.downloadToBuffer();
      return download;
    } catch (err) {
      throw new StorageError("Failed to download object", this.name, "download", err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.container.getBlockBlobClient(key).deleteIfExists();
    } catch (err) {
      throw new StorageError("Failed to delete object", this.name, "delete", err);
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      for await (const blob of this.container.listBlobsFlat({ prefix })) {
        await this.container.getBlockBlobClient(blob.name).deleteIfExists();
      }
    } catch (err) {
      throw new StorageError("Failed to delete prefix", this.name, "deleteByPrefix", err);
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<StorageObjectMetadata> {
    try {
      const sourceClient = this.container.getBlockBlobClient(sourceKey);
      const destClient = this.container.getBlockBlobClient(destinationKey);
      const copyPoller = await destClient.beginCopyFromURL(sourceClient.url);
      await copyPoller.pollUntilDone();
      await sourceClient.deleteIfExists();
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
      return await this.container.getBlockBlobClient(key).exists();
    } catch (err) {
      throw new StorageError("Failed to check existence", this.name, "exists", err);
    }
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const blobClient = this.container.getBlockBlobClient(key);
      if (!(await blobClient.exists())) return null;
      const props = await blobClient.getProperties();
      return {
        key,
        size: props.contentLength ?? 0,
        contentType: props.contentType,
        etag: props.etag,
        lastModified: props.lastModified,
      };
    } catch (err) {
      throw new StorageError("Failed to fetch object metadata", this.name, "getMetadata", err);
    }
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    try {
      const blobClient = this.container.getBlockBlobClient(key);
      if (!this.sharedKeyCredential || !this.accountName) {
        // Connection-string auth doesn't expose the account key needed to
        // sign a SAS token client-side; fall back to the (private) blob URL.
        // Recommended follow-up: configure AZURE_STORAGE_ACCOUNT +
        // AZURE_STORAGE_ACCOUNT_KEY if signed URLs are required in this mode.
        return blobClient.url;
      }

      const expiresOn = new Date(Date.now() + (options?.expiresInSeconds ?? 3600) * 1000);
      const permissions = options?.operation === "put" ? BlobSASPermissions.parse("cw") : BlobSASPermissions.parse("r");

      const sas = generateBlobSASQueryParameters(
        {
          containerName: this.container.containerName,
          blobName: key,
          permissions,
          expiresOn,
          protocol: SASProtocol.Https,
        },
        this.sharedKeyCredential
      ).toString();

      return `${blobClient.url}?${sas}`;
    } catch (err) {
      throw new StorageError("Failed to sign URL", this.name, "getSignedUrl", err);
    }
  }

  async list(prefix: string, maxKeys = 1000): Promise<StorageObjectMetadata[]> {
    try {
      const results: StorageObjectMetadata[] = [];
      for await (const blob of this.container.listBlobsFlat({ prefix })) {
        if (results.length >= maxKeys) break;
        results.push({
          key: blob.name,
          size: blob.properties.contentLength ?? 0,
          contentType: blob.properties.contentType,
          etag: blob.properties.etag,
          lastModified: blob.properties.lastModified,
        });
      }
      return results;
    } catch (err) {
      throw new StorageError("Failed to list objects", this.name, "list", err);
    }
  }
}
