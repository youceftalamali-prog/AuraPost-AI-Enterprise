// src/features/templates/templatesApi.ts
// Loads the Ready-Templates catalog from the API, falling back to the local
// seed catalog when the endpoint is unavailable or empty. Keeping the seed as
// a graceful fallback means the gallery always renders, even before the
// server-side catalog (and its showcase media) is populated.

import { SEED_TEMPLATES, type ReadyTemplate } from './templateCatalog';

export async function loadReadyTemplates(signal?: AbortSignal): Promise<ReadyTemplate[]> {
  try {
    const response = await fetch('/api/templates', {
      signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return SEED_TEMPLATES;
    const payload: unknown = await response.json();
    if (Array.isArray(payload) && payload.length > 0) {
      return payload as ReadyTemplate[];
    }
    return SEED_TEMPLATES;
  } catch {
    return SEED_TEMPLATES;
  }
}
