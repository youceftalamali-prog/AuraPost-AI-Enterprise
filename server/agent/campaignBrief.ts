import { AgentContractError } from './contracts';

export type BriefEvidenceType = 'product_fact' | 'market_evidence' | 'user_input' | 'ai_inference' | 'missing';
export interface BriefEvidence { id: string; field: string; type: BriefEvidenceType; value: string; source: string }
export interface CampaignBriefData {
  objective: string;
  targetMarket: string;
  targetAudience: string;
  customerProblem: string;
  valueProposition: string;
  primaryAngle: string;
  offer: string;
  tone: string;
  keyBenefits: string[];
  objections: string[];
  contentFormats: string[];
  creativeDirection: string;
  profitability: { status: 'not_assessed'; reason: string };
  evidenceReadiness: 'draft' | 'mixed' | 'verified';
}
export interface CampaignBriefDraftInput {
  objective: string; targetMarket: string; targetAudience: string; customerProblem: string;
  valueProposition: string; primaryAngle: string; offer: string; tone: string;
  keyBenefits: string[]; objections: string[]; contentFormats: string[]; creativeDirection: string;
}

function text(value: unknown, field: string, max = 1000): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new AgentContractError('INVALID_CAMPAIGN_BRIEF', `${field} must be text.`);
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length > max) throw new AgentContractError('INVALID_CAMPAIGN_BRIEF', `${field} exceeds ${max} characters.`);
  return cleaned;
}
function list(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw new AgentContractError('INVALID_CAMPAIGN_BRIEF', `${field} must contain at most 20 items.`);
  return value.map((item, index) => text(item, `${field}[${index}]`, 300)).filter(Boolean);
}
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }

export function normalizeCampaignBriefDraft(value: unknown): CampaignBriefDraftInput {
  if (!record(value)) throw new AgentContractError('INVALID_CAMPAIGN_BRIEF', 'Request body must be an object.');
  return {
    objective: text(value.objective, 'objective', 300), targetMarket: text(value.targetMarket, 'targetMarket', 200),
    targetAudience: text(value.targetAudience, 'targetAudience', 500), customerProblem: text(value.customerProblem, 'customerProblem', 800),
    valueProposition: text(value.valueProposition, 'valueProposition', 800), primaryAngle: text(value.primaryAngle, 'primaryAngle', 500),
    offer: text(value.offer, 'offer', 500), tone: text(value.tone, 'tone', 200), keyBenefits: list(value.keyBenefits, 'keyBenefits'),
    objections: list(value.objections, 'objections'), contentFormats: list(value.contentFormats, 'contentFormats'),
    creativeDirection: text(value.creativeDirection, 'creativeDirection', 1000),
  };
}

function evidence(field: string, type: BriefEvidenceType, value: string, source: string): BriefEvidence {
  return { id: `${type}:${field}`, field, type, value, source };
}

export function buildCampaignBrief(input: CampaignBriefDraftInput, context: {
  prompt: string; templateId: string | null; marketContext: Record<string, unknown>;
  product: { title: string; description: string | null; vendor: string | null; price: number | null; currency: string | null } | null;
}): { brief: CampaignBriefData; evidence: BriefEvidence[]; warnings: string[] } {
  const entries: BriefEvidence[] = [];
  const addUser = (field: string, value: string) => value && entries.push(evidence(field, 'user_input', value, 'Campaign brief form'));
  addUser('objective', input.objective); addUser('targetMarket', input.targetMarket); addUser('targetAudience', input.targetAudience);
  addUser('customerProblem', input.customerProblem); addUser('valueProposition', input.valueProposition); addUser('primaryAngle', input.primaryAngle);
  addUser('offer', input.offer); addUser('tone', input.tone); addUser('creativeDirection', input.creativeDirection);
  if (context.prompt) entries.push(evidence('instructions', 'user_input', context.prompt, 'Aura workflow prompt'));
  if (context.templateId) entries.push(evidence('template', 'user_input', context.templateId, 'Selected Aura template'));
  if (context.product) {
    entries.push(evidence('productTitle', 'product_fact', context.product.title, 'Imported product record'));
    if (context.product.vendor) entries.push(evidence('vendor', 'product_fact', context.product.vendor, 'Imported product record'));
    if (context.product.price !== null) entries.push(evidence('price', 'product_fact', `${context.product.price} ${context.product.currency || ''}`.trim(), 'Imported product record'));
    if (context.product.description) entries.push(evidence('description', 'product_fact', context.product.description.slice(0, 500), 'Imported product record'));
  } else entries.push(evidence('product', 'missing', 'No saved product is attached.', 'Aura workflow'));
  const marketSource = typeof context.marketContext.source === 'string' ? context.marketContext.source : '';
  const marketLive = context.marketContext.liveDataAvailable === true;
  if (marketLive && marketSource) entries.push(evidence('market', 'market_evidence', 'Live market evidence attached.', marketSource));
  else entries.push(evidence('market', 'missing', 'No verified live market evidence is attached.', 'Aura Market Intelligence'));

  const missing = entries.filter((item) => item.type === 'missing').length;
  const verified = entries.some((item) => item.type === 'market_evidence');
  const brief: CampaignBriefData = {
    ...input,
    contentFormats: input.contentFormats.length ? input.contentFormats : ['short_video', 'product_image', 'ad_copy'],
    profitability: { status: 'not_assessed', reason: 'Profitability requires landed cost, shipping, platform fees, advertising cost, returns, and expected sale price.' },
    evidenceReadiness: verified && missing === 0 ? 'verified' : entries.some((item) => item.type === 'product_fact' || item.type === 'user_input') ? 'mixed' : 'draft',
  };
  const warnings: string[] = [];
  if (!input.targetAudience) warnings.push('Target audience requires user confirmation.');
  if (!input.valueProposition) warnings.push('Value proposition requires user confirmation.');
  if (!verified) warnings.push('Market claims must remain empty until verified evidence is attached.');
  warnings.push(brief.profitability.reason);
  return { brief, evidence: entries, warnings };
}

export function assertBriefApprovable(brief: CampaignBriefData): void {
  for (const field of ['objective', 'targetMarket', 'targetAudience', 'valueProposition', 'primaryAngle'] as const) {
    if (!brief[field]) throw new AgentContractError('CAMPAIGN_BRIEF_INCOMPLETE', `${field} is required before approval.`);
  }
}
