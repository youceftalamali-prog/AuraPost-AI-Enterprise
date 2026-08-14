import type { AgentLocale, AgentSourceMode } from './types';

export type AgentWorkflowStep =
  | 'import_product'
  | 'select_product'
  | 'prepare_assets'
  | 'campaign_brief'
  | 'market_analysis'
  | 'content_generation'
  | 'creative_direction'
  | 'production_blueprint'
  | 'video_generation'
  | 'campaign_export'
  | 'completed';
export type AgentWorkflowStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export interface AgentWorkflow {id:string;sourceMode:AgentSourceMode;locale:AgentLocale;prompt:string;templateId:string|null;productId:string|null;marketContext:Record<string,unknown>;creativeContext:Record<string,unknown>;currentStep:AgentWorkflowStep;status:AgentWorkflowStatus;version:number;createdAt:string;updatedAt:string}
interface WorkflowEnvelope {workflow:AgentWorkflow|null}
export interface AgentWorkflowPatch {prompt?:string;templateId?:string|null;productId?:string|null;locale?:AgentLocale;currentStep?:AgentWorkflowStep;status?:AgentWorkflowStatus;marketContext?:Record<string,unknown>;creativeContext?:Record<string,unknown>}
type WorkflowTarget={kind:'active'}|{kind:'create'}|{kind:'update';workflowId:string};
const UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function workflowUrl(target:WorkflowTarget):string{if(target.kind==='active')return'/api/agent/workflows/active';if(target.kind==='create')return'/api/agent/workflows';if(!UUID_PATTERN.test(target.workflowId))throw new Error('Aura returned an invalid workflow identifier.');return`/api/agent/workflows/${encodeURIComponent(target.workflowId)}`;}
async function requestWorkflow(target:WorkflowTarget,init?:RequestInit):Promise<WorkflowEnvelope>{const response=await fetch(workflowUrl(target),{credentials:'include',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});const payload=await response.json().catch(()=>({}))as WorkflowEnvelope&{error?:string;code?:string};if(!response.ok){const error=new Error(payload.error||'Aura workflow request failed.')as Error&{code?:string};error.code=payload.code;throw error;}return payload;}
export async function loadActiveAgentWorkflow(signal?:AbortSignal):Promise<AgentWorkflow|null>{const result=await requestWorkflow({kind:'active'},{method:'GET',signal});return result.workflow;}
export async function createAgentWorkflow(input:{sourceMode:AgentSourceMode;locale:AgentLocale;prompt:string;templateId?:string;productId?:string}):Promise<AgentWorkflow>{const result=await requestWorkflow({kind:'create'},{method:'POST',headers:{'Idempotency-Key':globalThis.crypto.randomUUID()},body:JSON.stringify(input)});if(!result.workflow)throw new Error('Aura did not return the created workflow.');return result.workflow;}
export async function patchAgentWorkflow(workflow:AgentWorkflow,patch:AgentWorkflowPatch):Promise<AgentWorkflow>{const result=await requestWorkflow({kind:'update',workflowId:workflow.id},{method:'PATCH',body:JSON.stringify({expectedVersion:workflow.version,...patch})});if(!result.workflow)throw new Error('Aura did not return the updated workflow.');return result.workflow;}
