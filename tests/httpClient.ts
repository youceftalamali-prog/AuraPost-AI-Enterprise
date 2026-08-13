import http, { type IncomingHttpHeaders } from "node:http";

const BASE_URL = process.env.TEST_URL || "http://127.0.0.1:3000";

export interface HttpResult {
  status: number;
  body: unknown;
  headers: IncomingHttpHeaders;
}

interface StoredCookie {
  value: string;
  path: string;
}

export class CookieJar {
  private readonly cookies = new Map<string, StoredCookie>();

  capture(headers: IncomingHttpHeaders): void {
    const setCookieHeader = headers["set-cookie"];
    const setCookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : typeof setCookieHeader === "string"
        ? [setCookieHeader]
        : [];

    for (const setCookie of setCookies) {
      const segments = setCookie.split(";").map((segment) => segment.trim());
      const nameValue = segments.shift();
      if (!nameValue) continue;

      const separatorIndex = nameValue.indexOf("=");
      if (separatorIndex < 1) continue;

      const name = nameValue.slice(0, separatorIndex);
      const value = nameValue.slice(separatorIndex + 1);
      let cookiePath = "/";
      let shouldDelete = value.length === 0;

      for (const attribute of segments) {
        const [rawName, ...rawValue] = attribute.split("=");
        const attributeName = rawName.toLowerCase();
        const attributeValue = rawValue.join("=");
        if (attributeName === "path" && attributeValue) cookiePath = attributeValue;
        if (attributeName === "max-age" && Number(attributeValue) <= 0) shouldDelete = true;
        if (attributeName === "expires") {
          const expiration = Date.parse(attributeValue);
          if (Number.isFinite(expiration) && expiration <= Date.now()) shouldDelete = true;
        }
      }

      if (shouldDelete) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, { value, path: cookiePath });
      }
    }
  }

  headerFor(path: string): string | undefined {
    const values = [...this.cookies.entries()]
      .filter(([, cookie]) => path.startsWith(cookie.path))
      .map(([name, cookie]) => `${name}=${cookie.value}`);
    return values.length ? values.join("; ") : undefined;
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  get(path: string, headers?: Record<string, string>): Promise<HttpResult> {
    return request("GET", path, undefined, headers, this);
  }

  post(path: string, body: unknown, headers?: Record<string, string>): Promise<HttpResult> {
    return request("POST", path, body, headers, this);
  }
}

export async function request(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
  cookieJar?: CookieJar,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const serializedBody = body === undefined ? undefined : JSON.stringify(body);
    const cookieHeader = cookieJar?.headerFor(url.pathname);
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(serializedBody ? { "Content-Type": "application/json" } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...headers,
        },
      },
      (res) => {
        let responseText = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { responseText += chunk; });
        res.on("end", () => {
          let parsedBody: unknown = responseText;
          if (responseText) {
            try { parsedBody = JSON.parse(responseText); } catch { /* keep text */ }
          }
          cookieJar?.capture(res.headers);
          resolve({ status: res.statusCode ?? 0, body: parsedBody, headers: res.headers });
        });
      },
    );

    req.setTimeout(10_000, () => req.destroy(new Error(`Request timed out: ${method} ${path}`)));
    req.on("error", reject);
    if (serializedBody) req.write(serializedBody);
    req.end();
  });
}

export function get(path: string, headers?: Record<string, string>): Promise<HttpResult> {
  return request("GET", path, undefined, headers);
}

export function post(path: string, body: unknown, headers?: Record<string, string>): Promise<HttpResult> {
  return request("POST", path, body, headers);
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected an object response, received: ${JSON.stringify(value)}`);
  }
  return value as Record<string, unknown>;
}
