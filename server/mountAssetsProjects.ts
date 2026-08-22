import type { Express } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';
import { initAssetsProjectsDb } from './database/index';
import { runAuraMigrations } from './database/auraMigrations';
import { createMigratedAuraPool } from './database/auraMigrationPool';
import assetRoutes from './assets/routes/index';
import projectRoutes from './projects/routes/index';
import { createAuraAgentRouter } from './agent/mount';
import { createCampaignBriefRouter } from './agent/campaignBriefRouter';
import { createCampaignContentRouter } from './agent/campaignContentRouter';
import { createCreativeDirectionRouter } from './agent/creativeDirectionRouter';
import { createProductionBlueprintRouter } from './agent/productionBlueprintRouter';
import { createMediaAssetRouter } from './agent/mediaAssetRouter';
import { createVideoRenderRouter } from './agent/videoRenderRouter';
import { createVideoReviewRouter } from './agent/videoReviewRouter';
import { createVideoSceneRevisionRouter } from './agent/videoSceneRevisionRouter';
import { createVideoReviewApprovalRouter } from './agent/videoReviewApprovalRouter';
import { createCampaignExportRouter } from './agent/campaignExportRouter';
import { createProductionDeliveryRouter } from './agent/productionDeliveryRouter';
import { createLaunchReadinessRouter } from './agent/launchReadinessRouter';
export interface AssetsProjectsAuthMiddleware {requireAuthAndWorkspace:()=>Array<(req:any,res:any,next:any)=>any>;attachAssetsProjectsContext:(req:any,res:any,next:any)=>any}
export function mountAssetsProjects(app:Express,pool:Pool,auth:AssetsProjectsAuthMiddleware):void{initAssetsProjectsDb(pool);const migrationsReady=runAuraMigrations(pool);const auraPool=createMigratedAuraPool(pool,migrationsReady);const api=Router();api.use(async(_req,_res,next)=>{try{await migrationsReady;next();}catch(error){next(error);}});api.use(...auth.requireAuthAndWorkspace(),auth.attachAssetsProjectsContext);api.use('/assets',assetRoutes);api.use('/projects',projectRoutes);api.use('/agent',createAuraAgentRouter(auraPool));api.use('/agent',createCampaignBriefRouter(auraPool));api.use('/agent',createCampaignContentRouter(auraPool));api.use('/agent',createCreativeDirectionRouter(auraPool));api.use('/agent',createProductionBlueprintRouter(auraPool));api.use('/agent',createMediaAssetRouter(auraPool));api.use('/agent',createVideoRenderRouter(auraPool));api.use('/agent',createVideoReviewRouter(auraPool));api.use('/agent',createVideoSceneRevisionRouter(auraPool));api.use('/agent',createVideoReviewApprovalRouter(auraPool));api.use('/agent',createCampaignExportRouter(auraPool));api.use('/agent',createProductionDeliveryRouter(auraPool));api.use('/agent',createLaunchReadinessRouter(auraPool));app.use('/api',api);}
