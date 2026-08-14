import type { Express } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';
import { initAssetsProjectsDb } from './database/index';
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
export function mountAssetsProjects(app:Express,pool:Pool,auth:AssetsProjectsAuthMiddleware):void{initAssetsProjectsDb(pool);const api=Router();api.use(...auth.requireAuthAndWorkspace(),auth.attachAssetsProjectsContext);api.use('/assets',assetRoutes);api.use('/projects',projectRoutes);api.use('/agent',createAuraAgentRouter(pool));api.use('/agent',createCampaignBriefRouter(pool));api.use('/agent',createCampaignContentRouter(pool));api.use('/agent',createCreativeDirectionRouter(pool));api.use('/agent',createProductionBlueprintRouter(pool));api.use('/agent',createMediaAssetRouter(pool));api.use('/agent',createVideoRenderRouter(pool));api.use('/agent',createVideoReviewRouter(pool));api.use('/agent',createVideoSceneRevisionRouter(pool));api.use('/agent',createVideoReviewApprovalRouter(pool));api.use('/agent',createCampaignExportRouter(pool));api.use('/agent',createProductionDeliveryRouter(pool));api.use('/agent',createLaunchReadinessRouter(pool));app.use('/api',api);}
