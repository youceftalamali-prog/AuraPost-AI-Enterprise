import type { AgentWorkflow } from './agentWorkflowApi';

export type BriefEvidenceType = 'product_fact' | 'market_evidence' | 'user_input' | 'ai_inference' | 'missing';
export interface BriefEvidence { id: string; field: string; type: BriefEvidenceType; value: string; source: string }
export interface CampaignBriefFields {
  objective: string; targetMarket: string; targetAudience: string; customerProblem: string;
  valueProposition: string; primaryAngle: string; offer: string; tone: string;
  keyBenefits: string[]; objections: string[]; contentFormats: string[]; creativeDirection: string;
  profitability?: { status: 'not_assessed'; reason: string };
  evidenceReadiness?: 'draft' | 'mixed' | 'verified';
}
export interface CampaignBriefRecord {
  id: string; workflowId: string; version: number; revision: number; status: 'draft' | 'approved';
  brief: CampaignBriefFields; evidence: BriefEvidence[]; warnings: string[]; createdAt: string; updatedAt: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response=await fetch(url,{credentials:'include',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});
  const payload=await response.json().catch(()=>({})) as T & {error?:string;code?:string};
  if(!response.ok){const error=new Error(payload.error||'Campaign brief request failed.') as Error & {code?:string};error.code=payload.code;throw error;}
  return payload;
}
export async function loadLatestCampaignBrief(workflowId:string,signal?:AbortSignal){const result=await request<{brief:CampaignBriefRecord|null}>(`/api/agent/workflows/${encodeURIComponent(workflowId)}/briefs/latest`,{signal});return result.brief;}
export async function createCampaignBriefDraft(workflow:AgentWorkflow,brief:CampaignBriefFields){const result=await request<{brief:CampaignBriefRecord}>(`/api/agent/workflows/${encodeURIComponent(workflow.id)}/briefs/draft`,{method:'POST',body:JSON.stringify(brief)});return result.brief;}
export async function updateCampaignBrief(workflowId:string,current:CampaignBriefRecord,brief:CampaignBriefFields,status:'draft'|'approved'){const result=await request<{brief:CampaignBriefRecord}>(`/api/agent/workflows/${encodeURIComponent(workflowId)}/briefs/${encodeURIComponent(current.id)}`,{method:'PATCH',body:JSON.stringify({expectedRevision:current.revision,status,brief})});return result.brief;}
