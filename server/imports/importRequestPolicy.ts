import { createHash } from "node:crypto";
import { AppError } from "../core/errors/AppError.ts";
import { normalizeImportPrompt, normalizeProductUrl } from "./productUrlPolicy.ts";

export interface SanitizedImportRequest {
  url: string;
  workspaceId: string;
  customPrompt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeImportRequestBody(
  body: unknown,
  workspaceId: string,
): SanitizedImportRequest {
  if (!isRecord(body)) {
    throw new AppError("A JSON product import request is required.", 400, {
      code: "INVALID_IMPORT_REQUEST",
    });
  }

  if (body.customPrompt !== undefined && typeof body.customPrompt !== "string") {
    throw new AppError("Import instructions must be text.", 400, {
      code: "INVALID_IMPORT_PROMPT",
    });
  }

  const customPrompt = normalizeImportPrompt(body.customPrompt as string | undefined);
  const sanitized: SanitizedImportRequest = {
    url: normalizeProductUrl(typeof body.url === "string" ? body.url : ""),
    workspaceId,
  };
  if (customPrompt) sanitized.customPrompt = customPrompt;
  return sanitized;
}

export function resolveImportIdempotencyKey(
  headerValue: string | undefined,
  request: SanitizedImportRequest,
): string {
  const explicitKey = headerValue?.trim();
  if (explicitKey) {
    if (explicitKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(explicitKey)) {
      throw new AppError("The Idempotency-Key header is invalid.", 400, {
        code: "INVALID_IDEMPOTENCY_KEY",
      });
    }
    return explicitKey;
  }

  const digest = createHash("sha256")
    .update(JSON.stringify([request.workspaceId, request.url, request.customPrompt || ""]))
    .digest("hex");
  return `auto-${digest}`;
}
