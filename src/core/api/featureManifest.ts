export interface FeatureManifest {
  releaseVersion: string;
  features: {
    socialConnections: boolean;
    publishing: boolean;
    smartRepost: boolean;
    paidAds: boolean;
  };
}

export const V1_FEATURE_FALLBACK: FeatureManifest = {
  releaseVersion: 'v1',
  features: {
    socialConnections: false,
    publishing: false,
    smartRepost: false,
    paidAds: false,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function booleanOrFalse(value: unknown): boolean {
  return value === true;
}

export async function loadFeatureManifest(signal?: AbortSignal): Promise<FeatureManifest> {
  const response = await fetch('/api/features', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Feature manifest request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !isRecord(payload.features)) {
    throw new Error('Feature manifest response has an invalid shape.');
  }

  return {
    releaseVersion:
      typeof payload.releaseVersion === 'string'
        ? payload.releaseVersion
        : V1_FEATURE_FALLBACK.releaseVersion,
    features: {
      socialConnections: booleanOrFalse(payload.features.socialConnections),
      publishing: booleanOrFalse(payload.features.publishing),
      smartRepost: booleanOrFalse(payload.features.smartRepost),
      paidAds: booleanOrFalse(payload.features.paidAds),
    },
  };
}
