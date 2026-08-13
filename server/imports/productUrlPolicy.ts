import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "../core/errors/AppError.ts";

const MAX_PRODUCT_URL_LENGTH = 2_048;
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_HOST_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".home",
  ".lan",
  ".test",
  ".invalid",
];

type ResolvedAddress = { address: string; family: number };

function rejectUrl(message: string, code = "UNSAFE_PRODUCT_URL"): never {
  throw new AppError(message, 400, { code });
}

function normalizedIp(address: string): string {
  return address.toLowerCase().replace(/^\[/, "").replace(/\]$/, "").split("%", 1)[0];
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)) || (b === 88 && c === 99))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function isPublicIpAddress(address: string): boolean {
  const value = normalizedIp(address);
  const version = isIP(value);
  if (version === 4) return isPublicIpv4(value);
  if (version !== 6) return false;

  const mappedIpv4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPublicIpv4(mappedIpv4);

  if (value === "::" || value === "::1") return false;
  if (/^(fc|fd)/.test(value)) return false;
  if (/^fe[89ab]/.test(value)) return false;
  if (value.startsWith("ff")) return false;
  if (value.startsWith("2001:db8") || value.startsWith("2001:10") || value.startsWith("2001:20")) return false;
  if (value.startsWith("2002:") || value.startsWith("64:ff9b:")) return false;
  return true;
}

export function normalizeProductUrl(input: string): string {
  if (typeof input !== "string" || input.trim() === "") {
    rejectUrl("A product URL is required.", "INVALID_PRODUCT_URL");
  }

  const candidate = input.trim();
  if (candidate.length > MAX_PRODUCT_URL_LENGTH) {
    rejectUrl("The product URL is too long.", "INVALID_PRODUCT_URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    rejectUrl("The product URL is invalid.", "INVALID_PRODUCT_URL");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    rejectUrl("Only HTTP and HTTPS product links are supported.");
  }
  if (parsed.username || parsed.password) {
    rejectUrl("Product links cannot contain credentials.");
  }
  if (!ALLOWED_PORTS.has(parsed.port)) {
    rejectUrl("The product URL uses a blocked network port.");
  }

  const hostname = normalizedIp(parsed.hostname);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    rejectUrl("Local product links are not allowed.");
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    rejectUrl("Private network product links are not allowed.");
  }

  const ipVersion = isIP(hostname);
  if (ipVersion > 0 && !isPublicIpAddress(hostname)) {
    rejectUrl("Private or reserved IP addresses are not allowed.");
  }
  if (ipVersion === 0 && !hostname.includes(".")) {
    rejectUrl("Internal host names are not allowed.");
  }

  parsed.hash = "";
  return parsed.toString();
}

export async function assertPublicProductUrl(input: string): Promise<string> {
  const safeUrl = normalizeProductUrl(input);
  const hostname = normalizedIp(new URL(safeUrl).hostname);
  if (isIP(hostname) > 0) return safeUrl;

  let records: ResolvedAddress[];
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    rejectUrl("The product host could not be resolved.", "PRODUCT_HOST_UNRESOLVED");
  }

  if (records.length === 0) {
    rejectUrl("The product host did not resolve to an address.", "PRODUCT_HOST_UNRESOLVED");
  }
  if (records.some((record) => !isPublicIpAddress(record.address))) {
    rejectUrl("The product host resolves to a private or reserved address.");
  }

  return safeUrl;
}

export function normalizeImportPrompt(prompt?: string): string | undefined {
  if (prompt === undefined || prompt.trim() === "") return undefined;
  const value = prompt.trim();
  if (value.length > 1_000) {
    throw new AppError("The import instructions must be 1,000 characters or fewer.", 400, {
      code: "IMPORT_PROMPT_TOO_LONG",
    });
  }
  return value;
}
