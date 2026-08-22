import { AsyncLocalStorage } from "node:async_hooks";
import { AppError } from "../core/errors/AppError.ts";
import { assertPublicProductUrl } from "./productUrlPolicy.ts";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const RUNTIME_SYMBOL = Symbol.for("aurapost.product-fetch-runtime");

const ALLOWED_CONTENT_TYPES = [
  "text/",
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/xhtml+xml",
  "application/javascript",
  "application/x-javascript",
];

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const SENSITIVE_HEADERS = ["authorization", "proxy-authorization", "cookie", "host"];

type NativeFetch = typeof globalThis.fetch;
type FetchInput = Parameters<NativeFetch>[0];
type FetchInit = Parameters<NativeFetch>[1];

type RuntimeState = {
  context: AsyncLocalStorage<boolean>;
  nativeFetch: NativeFetch;
  installed: boolean;
};

function runtimeStore(): Record<symbol, RuntimeState | undefined> {
  return globalThis as unknown as Record<symbol, RuntimeState | undefined>;
}

function getRuntimeState(): RuntimeState {
  const store = runtimeStore();
  const existing = store[RUNTIME_SYMBOL];
  if (existing) return existing;

  const state: RuntimeState = {
    context: new AsyncLocalStorage<boolean>(),
    nativeFetch: globalThis.fetch.bind(globalThis),
    installed: false,
  };
  store[RUNTIME_SYMBOL] = state;
  return state;
}

export function isAllowedProductContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  const mime = contentType.split(";", 1)[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.some((allowed) =>
    allowed.endsWith("/") ? mime.startsWith(allowed) : mime === allowed,
  );
}

export function isProductRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.has(status);
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new AppError("The product response is larger than the allowed limit.", 413, {
      code: "PRODUCT_RESPONSE_TOO_LARGE",
      maxBytes: MAX_RESPONSE_BYTES,
    });
  }

  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new AppError("The product response is larger than the allowed limit.", 413, {
        code: "PRODUCT_RESPONSE_TOO_LARGE",
        maxBytes: MAX_RESPONSE_BYTES,
      });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function fetchWithTimeout(
  nativeFetch: NativeFetch,
  url: string,
  init: RequestInit,
  externalSignal?: AbortSignal | null,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await nativeFetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AppError("The product source request timed out or was cancelled.", 408, {
        code: "PRODUCT_FETCH_TIMEOUT",
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}

async function safeProductFetch(
  nativeFetch: NativeFetch,
  input: FetchInput,
  init?: FetchInit,
): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const initialUrl = request ? request.url : String(input);
  let currentUrl = await assertPublicProductUrl(initialUrl);
  const method = (init?.method || request?.method || "GET").toUpperCase();

  if (method !== "GET" && method !== "HEAD") {
    throw new AppError("Product extraction network requests must use GET or HEAD.", 405, {
      code: "PRODUCT_FETCH_METHOD_BLOCKED",
    });
  }

  const headers = new Headers(request?.headers);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  const externalSignal = init?.signal || request?.signal;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchWithTimeout(
      nativeFetch,
      currentUrl,
      {
        ...init,
        method,
        headers,
        body: undefined,
        redirect: "manual",
      },
      externalSignal,
    );

    if (isProductRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) {
        throw new AppError("The product source returned an invalid redirect.", 502, {
          code: "PRODUCT_REDIRECT_MISSING_LOCATION",
        });
      }
      if (redirectCount >= MAX_REDIRECTS) {
        throw new AppError("The product source exceeded the redirect limit.", 508, {
          code: "PRODUCT_REDIRECT_LIMIT",
          maxRedirects: MAX_REDIRECTS,
        });
      }

      const previousOrigin = new URL(currentUrl).origin;
      const nextUrl = await assertPublicProductUrl(new URL(location, currentUrl).toString());
      if (new URL(nextUrl).origin !== previousOrigin) {
        for (const header of SENSITIVE_HEADERS) headers.delete(header);
      }
      currentUrl = nextUrl;
      continue;
    }

    const contentType = response.headers.get("content-type");
    if (!isAllowedProductContentType(contentType)) {
      await response.body?.cancel();
      throw new AppError("The product source returned an unsupported content type.", 415, {
        code: "PRODUCT_CONTENT_TYPE_BLOCKED",
        contentType,
      });
    }

    const hasNoBody = method === "HEAD" || response.status === 204 || response.status === 304;
    const body = hasNoBody ? null : await readBoundedBody(response);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.set("x-aurapost-final-url", currentUrl);
    if (body) responseHeaders.set("content-length", String(body.byteLength));

    const responseBody: BodyInit | null = body
      ? (body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer)
      : null;
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }

  throw new AppError("The product source exceeded the redirect limit.", 508, {
    code: "PRODUCT_REDIRECT_LIMIT",
  });
}

function installRuntimeGuard(state: RuntimeState): void {
  if (state.installed) return;

  const guardedFetch: NativeFetch = (input, init) => {
    if (!state.context.getStore()) return state.nativeFetch(input, init);
    return safeProductFetch(state.nativeFetch, input, init);
  };

  Object.defineProperty(globalThis, "fetch", {
    value: guardedFetch,
    writable: true,
    configurable: true,
  });
  state.installed = true;
}

export function withProductNetworkPolicy<T>(operation: () => Promise<T>): Promise<T> {
  const state = getRuntimeState();
  installRuntimeGuard(state);
  return state.context.run(true, operation);
}
