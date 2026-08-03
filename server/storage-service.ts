import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { URL } from "url";

const STORAGE_DIR = path.join(process.cwd(), "storage");
const IMAGES_DIR = path.join(STORAGE_DIR, "images");

const BLOCKED_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "169.254.169.254.nip.io",
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
]);

function isUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    if (BLOCKED_HOSTS.has(parsed.hostname)) {
      return false;
    }
    if (/^0x[0-9a-f]+$/i.test(parsed.hostname) || /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function ensureStorageDirectoriesExist() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

export async function storeImageInStorage(imageUrl: string): Promise<string> {
  ensureStorageDirectoriesExist();

  if (imageUrl.startsWith("/storage/")) {
    return imageUrl;
  }

  if (!isUrlSafe(imageUrl)) {
    return imageUrl;
  }

  const uuid = uuidv4().substring(0, 8);
  
  let ext = ".jpg";
  try {
    const cleanUrl = imageUrl.split(/[?#]/)[0];
    const match = cleanUrl.match(/\.(png|jpe?g|gif|webp|svg)/i);
    if (match) {
      ext = `.${match[1].toLowerCase()}`;
    }
  } catch {
    // default to .jpg
  }

  const filename = `img_${uuid}${ext}`;
  const localFilePath = path.join(IMAGES_DIR, filename);
  const serveUrl = `/storage/images/${filename}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "User-Agent": "AuraPost/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP fetch error! Status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`URL does not return an image (content-type: ${contentType})`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 10 * 1024 * 1024) {
      throw new Error("Image exceeds 10MB size limit");
    }

    fs.writeFileSync(localFilePath, Buffer.from(buffer));
    return serveUrl;
  } catch {
    return imageUrl;
  }
}

export async function downloadImageGallery(imageUrls: string[]): Promise<string[]> {
  const localUrls: string[] = [];
  for (const url of imageUrls) {
    const result = await storeImageInStorage(url);
    localUrls.push(result);
  }
  return localUrls;
}
