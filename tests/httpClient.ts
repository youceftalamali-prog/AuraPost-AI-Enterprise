import http, { type IncomingHttpHeaders } from "node:http";

const BASE_URL = process.env.TEST_URL || "http://127.0.0.1:3000";

export interface HttpResult {
  status: number;
  body: unknown;
  headers: IncomingHttpHeaders;
}

export async function request(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const serializedBody = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      url,
      {
        method,
        headers: {
          ...(serializedBody ? { "Content-Type": "application/json" } : {}),
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
          resolve({ status: res.statusCode ?? 0, body: parsedBody, headers: res.headers });
        });
      }
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
