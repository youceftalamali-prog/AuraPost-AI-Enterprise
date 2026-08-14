import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentContractError } from '../../server/agent/contracts.ts';
import { assertBriefApprovable, buildCampaignBrief, normalizeCampaignBriefDraft } from '../../server/agent/campaignBrief.ts';

const input=normalizeCampaignBriefDraft({objective:'Conversions',targetMarket:'Algeria',targetAudience:'Independent online sellers',customerProblem:'',valueProposition:'Fast product campaign creation',primaryAngle:'Save production time',offer:'',tone:'Confident',keyBenefits:['Faster workflow'],objections:[],contentFormats:['short_video'],creativeDirection:'Clean product visuals'});
test('brief preserves multilingual user evidence and product facts',()=>{const result=buildCampaignBrief({...input,targetAudience:'البائعون الأفراد'},{prompt:'حملة بالعربية',templateId:'universal-ugc',marketContext:{},product:{title:'Product A',description:'Real description',vendor:'Vendor',price:20,currency:'USD'}});assert.equal(result.brief.targetAudience,'البائعون الأفراد');assert.ok(result.evidence.some((e)=>e.type==='product_fact'));assert.ok(result.evidence.some((e)=>e.type==='missing'&&e.field==='market'));});
test('brief never claims profitability',()=>{const result=buildCampaignBrief(input,{prompt:'',templateId:null,marketContext:{liveDataAvailable:true,source:'DataForSEO'},product:null});assert.equal(result.brief.profitability.status,'not_assessed');assert.match(result.brief.profitability.reason,/landed cost/i);});
test('approval requires core user-confirmed fields',()=>{assert.throws(()=>assertBriefApprovable({...buildCampaignBrief(input,{prompt:'',templateId:null,marketContext:{},product:null}).brief,targetAudience:''}),AgentContractError);});
test('brief rejects oversized and unbounded input',()=>{assert.throws(()=>normalizeCampaignBriefDraft({objective:'x'.repeat(301)}),AgentContractError);assert.throws(()=>normalizeCampaignBriefDraft({keyBenefits:Array.from({length:21},()=> 'x')}),AgentContractError);});
