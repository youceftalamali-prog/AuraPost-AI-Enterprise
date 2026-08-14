import { AIProviderService, type ProviderResponse } from '../ai/provider';
import { AgentContractError, type AgentLocale } from './contracts';
import type { BriefEvidence, CampaignBriefData } from './campaignBrief';

export interface PackageHook { type:string; text:string; evidenceRefs:string[] }
export interface PackageScene { order:number; visual:string; voiceover:string; onScreenText:string; evidenceRefs:string[] }
export interface PackageScript { platform:string; title:string; durationSeconds:number; hook:string; scenes:PackageScene[]; cta:string; evidenceRefs:string[] }
export interface PackageAd { platform:string; format:'short'|'medium'|'long'; headline:string; primaryText:string; cta:string; evidenceRefs:string[] }
export interface CampaignContentPackage {
  campaignTitle:string;
  hooks:PackageHook[];
  scripts:PackageScript[];
  ads:PackageAd[];
  descriptions:{short:string;long:string;seoTitle:string;seoDescription:string;evidenceRefs:string[]};
  emails:Array<{type:string;subject:string;body:string;evidenceRefs:string[]}>;
  landingPage:{headline:string;subheadline:string;benefits:string[];objectionResponses:Array<{objection:string;response:string}>;faq:Array<{question:string;answer:string}>;cta:string;evidenceRefs:string[]};
  creativePrompts:{images:string[];videoConcepts:string[]};
  complianceNotes:string[];
}

function isRecord(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function text(value:unknown,field:string,max=4000):string{if(typeof value!=='string')throw new AgentContractError('INVALID_CONTENT_PACKAGE',`${field} must be text.`);const clean=value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();if(!clean||clean.length>max)throw new AgentContractError('INVALID_CONTENT_PACKAGE',`${field} must contain 1-${max} characters.`);return clean;}
function array(value:unknown,field:string,min:number,max:number):unknown[]{if(!Array.isArray(value)||value.length<min||value.length>max)throw new AgentContractError('INVALID_CONTENT_PACKAGE',`${field} must contain ${min}-${max} items.`);return value;}
function refs(value:unknown,field:string,valid:Set<string>):string[]{if(!Array.isArray(value)||value.length>30)throw new AgentContractError('INVALID_CONTENT_PACKAGE',`${field} must be an evidence reference array.`);return value.map((item,index)=>{const ref=text(item,`${field}[${index}]`,200);if(!valid.has(ref))throw new AgentContractError('INVALID_CONTENT_PACKAGE',`${field} contains an unknown evidence reference.`);return ref;});}
function strings(value:unknown,field:string,min:number,max:number,itemMax=800):string[]{return array(value,field,min,max).map((item,index)=>text(item,`${field}[${index}]`,itemMax));}

const riskyClaims:Array<{pattern:RegExp;label:string}>=[
 {pattern:/\b\d+(?:\.\d+)?%\b/g,label:'percentage'},
 {pattern:/\b(?:#\s?1|best[- ]selling|guaranteed|clinically proven|certified|limited stock|free shipping)\b/gi,label:'unsupported commercial claim'},
];
function allStrings(value:unknown,result:string[]=[]):string[]{if(typeof value==='string')result.push(value);else if(Array.isArray(value))value.forEach((item)=>allStrings(item,result));else if(isRecord(value))Object.values(value).forEach((item)=>allStrings(item,result));return result;}
export function assertGroundedClaims(payload:CampaignContentPackage,evidence:BriefEvidence[]):void{
 const evidenceText=evidence.filter((item)=>item.type!=='missing').map((item)=>item.value.toLowerCase()).join(' ');
 for(const content of allStrings(payload)){for(const rule of riskyClaims){rule.pattern.lastIndex=0;const matches=content.match(rule.pattern)||[];for(const match of matches){if(!evidenceText.includes(match.toLowerCase()))throw new AgentContractError('UNGROUNDED_CONTENT_CLAIM',`Generated content contains an unsupported ${rule.label}: ${match}`);}}}
}

export function normalizeCampaignContentPackage(value:unknown,evidence:BriefEvidence[]):CampaignContentPackage{
 if(!isRecord(value))throw new AgentContractError('INVALID_CONTENT_PACKAGE','AI response must be an object.');
 const valid=new Set(evidence.filter((item)=>item.type!=='missing').map((item)=>item.id));
 const hooks=array(value.hooks,'hooks',4,12).map((item,index)=>{if(!isRecord(item))throw new AgentContractError('INVALID_CONTENT_PACKAGE',`hooks[${index}] must be an object.`);return{type:text(item.type,`hooks[${index}].type`,80),text:text(item.text,`hooks[${index}].text`,500),evidenceRefs:refs(item.evidenceRefs??[],`hooks[${index}].evidenceRefs`,valid)};});
 const scripts=array(value.scripts,'scripts',2,6).map((item,index)=>{if(!isRecord(item))throw new AgentContractError('INVALID_CONTENT_PACKAGE',`scripts[${index}] must be an object.`);const duration=Number(item.durationSeconds);if(!Number.isInteger(duration)||duration<10||duration>90)throw new AgentContractError('INVALID_CONTENT_PACKAGE',`scripts[${index}].durationSeconds must be 10-90.`);const scenes=array(item.scenes,`scripts[${index}].scenes`,3,10).map((scene,sceneIndex)=>{if(!isRecord(scene))throw new AgentContractError('INVALID_CONTENT_PACKAGE','Scene must be an object.');return{order:sceneIndex+1,visual:text(scene.visual,'scene.visual',1000),voiceover:text(scene.voiceover,'scene.voiceover',1000),onScreenText:text(scene.onScreenText,'scene.onScreenText',500),evidenceRefs:refs(scene.evidenceRefs??[],'scene.evidenceRefs',valid)};});return{platform:text(item.platform,`scripts[${index}].platform`,80),title:text(item.title,`scripts[${index}].title`,200),durationSeconds:duration,hook:text(item.hook,`scripts[${index}].hook`,500),scenes,cta:text(item.cta,`scripts[${index}].cta`,500),evidenceRefs:refs(item.evidenceRefs??[],`scripts[${index}].evidenceRefs`,valid)};});
 const ads=array(value.ads,'ads',3,12).map((item,index)=>{if(!isRecord(item))throw new AgentContractError('INVALID_CONTENT_PACKAGE','Ad must be an object.');const format=text(item.format,`ads[${index}].format`,20);if(!['short','medium','long'].includes(format))throw new AgentContractError('INVALID_CONTENT_PACKAGE','Unsupported ad format.');return{platform:text(item.platform,`ads[${index}].platform`,80),format:format as 'short'|'medium'|'long',headline:text(item.headline,`ads[${index}].headline`,300),primaryText:text(item.primaryText,`ads[${index}].primaryText`,2000),cta:text(item.cta,`ads[${index}].cta`,300),evidenceRefs:refs(item.evidenceRefs??[],`ads[${index}].evidenceRefs`,valid)};});
 if(!isRecord(value.descriptions)||!isRecord(value.landingPage)||!isRecord(value.creativePrompts))throw new AgentContractError('INVALID_CONTENT_PACKAGE','Descriptions, landingPage, and creativePrompts are required.');
 const descriptions={short:text(value.descriptions.short,'descriptions.short',800),long:text(value.descriptions.long,'descriptions.long',4000),seoTitle:text(value.descriptions.seoTitle,'descriptions.seoTitle',200),seoDescription:text(value.descriptions.seoDescription,'descriptions.seoDescription',500),evidenceRefs:refs(value.descriptions.evidenceRefs??[],'descriptions.evidenceRefs',valid)};
 const emails=array(value.emails,'emails',2,6).map((item,index)=>{if(!isRecord(item))throw new AgentContractError('INVALID_CONTENT_PACKAGE','Email must be an object.');return{type:text(item.type,`emails[${index}].type`,80),subject:text(item.subject,`emails[${index}].subject`,300),body:text(item.body,`emails[${index}].body`,4000),evidenceRefs:refs(item.evidenceRefs??[],`emails[${index}].evidenceRefs`,valid)};});
 const landingPage={headline:text(value.landingPage.headline,'landingPage.headline',300),subheadline:text(value.landingPage.subheadline,'landingPage.subheadline',500),benefits:strings(value.landingPage.benefits,'landingPage.benefits',3,12),objectionResponses:array(value.landingPage.objectionResponses,'landingPage.objectionResponses',1,12).map((item)=>{if(!isRecord(item))throw new AgentContractError('INVALID_CONTENT_PACKAGE','Objection response must be an object.');return{objection:text(item.objection,'objection',500),response:text(item.response,'response',1000)};}),faq:array(value.landingPage.faq,'landingPage.faq',3,10).map((item)=>{if(!isRecord(item))throw new AgentContractError('INVALID_CONTENT_PACKAGE','FAQ must be an object.');return{question:text(item.question,'faq.question',500),answer:text(item.answer,'faq.answer',1200)};}),cta:text(value.landingPage.cta,'landingPage.cta',300),evidenceRefs:refs(value.landingPage.evidenceRefs??[],'landingPage.evidenceRefs',valid)};
 const payload={campaignTitle:text(value.campaignTitle,'campaignTitle',300),hooks,scripts,ads,descriptions,emails,landingPage,creativePrompts:{images:strings(value.creativePrompts.images,'creativePrompts.images',3,12,1500),videoConcepts:strings(value.creativePrompts.videoConcepts,'creativePrompts.videoConcepts',2,8,1500)},complianceNotes:strings(value.complianceNotes??['Verify all claims before use.'],'complianceNotes',1,20,500)};
 if(Buffer.byteLength(JSON.stringify(payload),'utf8')>256*1024)throw new AgentContractError('INVALID_CONTENT_PACKAGE','Generated package exceeds 256 KiB.');
 assertGroundedClaims(payload,evidence);return payload;
}

const schema=`{"campaignTitle":"...","hooks":[{"type":"problem|benefit|curiosity|ugc|direct_response|story","text":"...","evidenceRefs":[]}],"scripts":[{"platform":"tiktok|instagram_reels|youtube_shorts","title":"...","durationSeconds":30,"hook":"...","scenes":[{"visual":"...","voiceover":"...","onScreenText":"...","evidenceRefs":[]}],"cta":"...","evidenceRefs":[]}],"ads":[{"platform":"facebook|instagram|tiktok|google","format":"short|medium|long","headline":"...","primaryText":"...","cta":"...","evidenceRefs":[]}],"descriptions":{"short":"...","long":"...","seoTitle":"...","seoDescription":"...","evidenceRefs":[]},"emails":[{"type":"welcome|promotional|abandoned_cart|launch","subject":"...","body":"...","evidenceRefs":[]}],"landingPage":{"headline":"...","subheadline":"...","benefits":["..."],"objectionResponses":[{"objection":"...","response":"..."}],"faq":[{"question":"...","answer":"..."}],"cta":"...","evidenceRefs":[]},"creativePrompts":{"images":["..."],"videoConcepts":["..."]},"complianceNotes":["..."]}`;
export async function generateCampaignContentPackage(input:{workspaceId:string;locale:AgentLocale;brief:CampaignBriefData;evidence:BriefEvidence[];product:Record<string,unknown>|null}):Promise<{payload:CampaignContentPackage;provider:ProviderResponse}>{
 const language=input.locale==='ar'?'Arabic':input.locale==='fr'?'French':'English';
 const usableEvidence=input.evidence.filter((item)=>item.type!=='missing');
 const prompt=`Create a complete campaign content package in ${language}.\nAPPROVED BRIEF:\n${JSON.stringify(input.brief)}\nPRODUCT FACTS:\n${JSON.stringify(input.product||{})}\nALLOWED EVIDENCE REFERENCES:\n${JSON.stringify(usableEvidence)}\nRules: use only supplied facts; generic persuasive language may use no evidence reference. Every factual or quantitative claim must cite matching evidenceRefs. Never invent reviews, testimonials, discounts, urgency, scarcity, shipping, certifications, rankings, performance, market size, or profitability. Do not add publishing schedules or claim content was published. Return strict JSON only.`;
 const systemInstruction='You are Aura, an evidence-grounded multilingual ecommerce campaign writer. Produce conversion-oriented content without fabricating facts. Empty evidence means omit the factual claim, never guess. Follow the exact JSON contract.';
 const provider=await AIProviderService.generateJSON(prompt,systemInstruction,schema,{workflow:'standard',temperature:0.25,allowFallbacks:true},input.workspaceId);
 if(!provider.rawContent.trim())throw new AgentContractError('CONTENT_PROVIDER_EMPTY','AI provider returned empty content.');
 const parsed=AIProviderService.cleanAndParseJSON<unknown>(provider.rawContent);
 return{payload:normalizeCampaignContentPackage(parsed,input.evidence),provider};
}
