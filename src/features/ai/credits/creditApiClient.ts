/**
 * The authoritative credit balance client. Fetches real, persisted balances
 * from `/api/billing/credits`, backed by the `credit_ledger` table via
 * `server/db.ts` (`getWorkspaceCreditSummary`).
 *
 * Use this — not `CreditManager`'s local in-memory Map — anywhere a real
 * (not just estimated) balance matters: e.g. disabling a "Generate" button
 * when a workspace is actually out of credits. `CreditManager` is fine for
 * UX estimates/forecasts but must never be treated as the source of truth
 * (see the warning at the top of CreditManager.ts).
 */

export interface WorkspaceCreditBucketSummary {
  bucket: 'ai' | 'video' | 'publishing';
  label: string;
  balance: number;
  monthlyAllocation: number;
}

export interface WorkspaceCreditSummaryResponse {
  workspaceId: string;
  buckets: Record<string, WorkspaceCreditBucketSummary>;
  totalBalance: number;
}

export async function fetchWorkspaceCreditSummary(
  workspaceId: string,
  authToken?: string
): Promise<WorkspaceCreditSummaryResponse> {
  const response = await fetch(`/api/billing/credits?workspaceId=${encodeURIComponent(workspaceId)}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch credit summary (HTTP ${response.status})`);
  }

  return response.json();
}

/** Convenience check for gating a "Generate" action against the real 'ai' bucket balance. */
export async function hasSufficientAICredits(
  workspaceId: string,
  requiredCredits: number,
  authToken?: string
): Promise<boolean> {
  const summary = await fetchWorkspaceCreditSummary(workspaceId, authToken);
  const aiBucket = summary.buckets?.ai;
  return (aiBucket?.balance ?? 0) >= requiredCredits;
}
