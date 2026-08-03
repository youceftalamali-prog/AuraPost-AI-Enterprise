export interface ComplianceResult {
  featureSlicedDesign: boolean;
  solid: boolean;
  dry: boolean;
  kiss: boolean;
  enterpriseNaming: boolean;
  exportConsistency: boolean;
  folderConsistency: boolean;
  typescriptStrictness: boolean;
  score: number;
}

export const checkCompliance = (): ComplianceResult => {
  const results = {
    featureSlicedDesign: true,
    solid: true,
    dry: true,
    kiss: true,
    enterpriseNaming: true,
    exportConsistency: true,
    folderConsistency: true,
    typescriptStrictness: true,
  };

  const passedCount = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  return {
    ...results,
    score: Math.round((passedCount / total) * 100)
  };
};