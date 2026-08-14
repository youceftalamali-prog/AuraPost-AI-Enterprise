import crypto from 'node:crypto';
import type { ProductionBlueprint, ProductionAssetKind } from './productionBlueprint';
import { AgentContractError } from './contracts';

export const MEDIA_IMAGE_CREDIT_COST = 20;
export const MEDIA_MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export type MediaJobStatus='planned'|'processing'|'succeeded'|'failed'|'blocked'|'skipped'|'cancelled';
export interface PlannedMediaJob {id:string;slotId:string;targetId:string;sceneId:string;kind:ProductionAssetKind;status:MediaJobStatus;prompt:string;negativePrompt:string;aspectRatio:string;width:number;height:number;required:boolean;evidenceRefs:string[];estimatedCredits:number}
export interface MediaAssetPlan {schemaVersion:'aurapost.media-asset-plan.v1';blueprintSha256:string;jobs:PlannedMediaJob[];estimatedCredits:number;generationEnabled:boolean;renderingEnabled:false;publishingEnabled:false}

export function planMediaAssets(blueprint:ProductionBlueprint):MediaAssetPlan{
 const jobs:PlannedMediaJob[]=[];
 for(const target of blueprint.targets){for(const scene of target.scenes){for(const slot of scene.assetSlots){
  const generatable=slot.kind==='generated_visual';
  jobs.push({id:crypto.createHash('sha256').update(`${blueprint.contentSha256}:${slot.id}`).digest('hex').slice(0,32),slotId:slot.id,targetId:target.id,sceneId:scene.id,kind:slot.kind,status:generatable?'planned':slot.kind==='product_reference'?'skipped':'blocked',prompt:slot.prompt,negativePrompt:slot.negativePrompt??'',aspectRatio:target.aspectRatio,width:target.width,height:target.height,required:slot.required,evidenceRefs:[...slot.evidenceRefs],estimatedCredits:generatable?MEDIA_IMAGE_CREDIT_COST:0});
 }}}
 const estimatedCredits=jobs.reduce((sum,job)=>sum+job.estimatedCredits,0);
 return{schemaVersion:'aurapost.media-asset-plan.v1',blueprintSha256:blueprint.contentSha256,jobs,estimatedCredits,generationEnabled:true,renderingEnabled:false,publishingEnabled:false};
}

export function decodeGeneratedImage(value:string):{buffer:Buffer;contentType:string}{
 if(!value.startsWith('data:image/'))throw new AgentContractError('MEDIA_PROVIDER_OUTPUT_UNSUPPORTED','The provider returned a remote or unsupported image. No credits will be charged.');
 const marker=';base64,';const markerIndex=value.indexOf(marker);if(markerIndex<11)throw new AgentContractError('MEDIA_PROVIDER_OUTPUT_INVALID','The provider returned an invalid image payload.');
 const contentType=value.slice(5,markerIndex);if(!['image/png','image/jpeg','image/webp'].includes(contentType))throw new AgentContractError('MEDIA_PROVIDER_OUTPUT_INVALID','The provider returned an unsupported image type.');
 const encoded=value.slice(markerIndex+marker.length);if(!encoded||encoded.length>Math.ceil(MEDIA_MAX_IMAGE_BYTES*4/3)+8)throw new AgentContractError('MEDIA_PROVIDER_OUTPUT_TOO_LARGE','Generated image exceeds the 25 MiB limit.');
 const buffer=Buffer.from(encoded,'base64');if(!buffer.length||buffer.length>MEDIA_MAX_IMAGE_BYTES)throw new AgentContractError('MEDIA_PROVIDER_OUTPUT_TOO_LARGE','Generated image exceeds the 25 MiB limit.');
 return{buffer,contentType};
}

export function mediaProviderConfiguration():{provider:'gemini_images'|'stability_ai';verified:boolean}{
 const configured=process.env.MEDIA_ASSET_IMAGE_PROVIDER||'gemini_images';
 if(configured!=='gemini_images'&&configured!=='stability_ai')throw new AgentContractError('MEDIA_PROVIDER_UNSUPPORTED','MEDIA_ASSET_IMAGE_PROVIDER must be gemini_images or stability_ai.');
 const verified=process.env.MEDIA_ASSET_PROVIDER_VERIFIED==='true'||process.env.TEST_MODE==='true';
 return{provider:configured,verified};
}
