function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeImportStartResponse(body: unknown): unknown {
  if (!isRecord(body) || typeof body.operationId === "string") return body;
  const operation = isRecord(body.operation) ? body.operation : null;
  if (!operation || typeof operation.id !== "string") return body;
  return { ...body, operationId: operation.id };
}
