import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import {
  StorageProvider,
  StorageObjectMetadata,
  UploadOptions,
  SignedUrlOptions,
  StorageError,
} from "../StorageProvider";

/**
 * Local-disk storage provider. Default backend for local development and
 * for deployments that haven't configured a cloud provider yet.
 *
 * Objects are written under `LOCAL_STORAGE_ROOT` (default: `./storage/uploads`)
 * and served back via `LOCAL_STORAGE_PUBLIC_BASE_URL` (default:
 * `/storage-files`, expected to be mounted with `express.static` in server.ts).
 *
 * "Signed" URLs here are HMAC-signed query params checked by the static
 * route, giving expiry semantics comparable to the cloud providers even
 * though the files are technically world-readable on disk.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  private readonly root: string;
  private readonly publicBaseUrl: string;
  private readonly signingSecret: string;

  constructor(options?: { root?: string; publicBaseUrl?: string; signingSecret?: string }) {
    this.root = options?.root ?? process.env.LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), "storage", "uploads");
    this.publicBaseUrl = options?.publicBaseUrl ?? process.env.LOCAL_STORAGE_PUBLIC_BASE_URL ?? "/storage-files";
    this.signingSecret =
      options?.signingSecret ?? process.env.LOCAL_STORAGE_SIGNING_SECRET ?? process.env.JWT_SECRET ?? "dev-local-storage-secret";
  }

  private resolvePath(key: string): string {
    const safeKey = key.replace(/^\/+/, "");
    const resolved = path.join(this.root, safeKey);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new StorageError(`Refusing to resolve key outside storage root: ${key}`, this.name, "resolvePath");
    }
    return resolved;
  }

  async upload(key: string, data: Buffer, _options?: UploadOptions): Promise<StorageObjectMetadata> {
    try {
      const fullPath = this.resolvePath(key);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, data);
      const stat = await fs.stat(fullPath);
      return {
        key,
        size: stat.size,
        contentType: _options?.contentType,
        lastModified: stat.mtime,
      };
    } catch (err) {
      throw new StorageError("Failed to write object", this.name, "upload", err);
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolvePath(key));
    } catch (err) {
      throw new StorageError("Failed to read object", this.name, "download", err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        throw new StorageError("Failed to delete object", this.name, "delete", err);
      }
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const dir = this.resolvePath(prefix);
      await fs.rm(dir, { recursive: true, force: true });
    } catch (err) {
      throw new StorageError("Failed to delete prefix", this.name, "deleteByPrefix", err);
    }
  }

  async move(sourceKey: string, destinationKey: string): Promise<StorageObjectMetadata> {
    try {
      const src = this.resolvePath(sourceKey);
      const dst = this.resolvePath(destinationKey);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.rename(src, dst);
      const stat = await fs.stat(dst);
      return { key: destinationKey, size: stat.size, lastModified: stat.mtime };
    } catch (err) {
      throw new StorageError("Failed to move object", this.name, "move", err);
    }
  }

  async rename(sourceKey: string, newKey: string): Promise<StorageObjectMetadata> {
    return this.move(sourceKey, newKey);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
    try {
      const stat = await fs.stat(this.resolvePath(key));
      return { key, size: stat.size, lastModified: stat.mtime };
    } catch {
      return null;
    }
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const expiresInSeconds = options?.expiresInSeconds ?? 3600;
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload = `${key}:${expiresAt}:${options?.operation ?? "get"}`;
    const signature = crypto.createHmac("sha256", this.signingSecret).update(payload).digest("hex");
    const encodedKey = encodeURIComponent(key);
    return `${this.publicBaseUrl}/${encodedKey}?expires=${expiresAt}&sig=${signature}&op=${options?.operation ?? "get"}`;
  }

  async list(prefix: string, maxKeys = 1000): Promise<StorageObjectMetadata[]> {
    const dir = this.resolvePath(prefix);
    const results: StorageObjectMetadata[] = [];

    async function walk(currentDir: string, currentPrefix: string) {
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= maxKeys) return;
        const entryKey = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walk(path.join(currentDir, entry.name), entryKey);
        } else {
          const stat = await fs.stat(path.join(currentDir, entry.name));
          results.push({ key: `${prefix}/${entryKey}`.replace(/\/+/g, "/"), size: stat.size, lastModified: stat.mtime });
        }
      }
    }

    await walk(dir, "");
    return results.slice(0, maxKeys);
  }

  /**
   * Verifies a signed URL's query params (expiry + HMAC). Used by the
   * `/storage-files/*` static route in server.ts to reject expired/tampered
   * links — the one piece of local-provider-specific wiring outside this
   * class, since it's a route handler, not a storage operation.
   */
  verifySignedRequest(key: string, expires: string, sig: string, op: string): boolean {
    const expiresAt = Number(expires);
    if (!expiresAt || Date.now() > expiresAt) return false;
    const payload = `${key}:${expiresAt}:${op}`;
    const expected = crypto.createHmac("sha256", this.signingSecret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  }
}
