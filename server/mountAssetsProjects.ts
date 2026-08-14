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

export interface AssetsProjectsAuthMiddleware {
  requireAuthAndWorkspace: () => Array<(req: any, res: any, next: any) => any>;
  attachAssetsProjectsContext: (req: any, res: any, next: any) => any;
}

export function mountAssetsProjects(app: Express, pool: Pool, auth: AssetsProjectsAuthMiddleware): void {
  initAssetsProjectsDb(pool);
  const api = Router();
  api.use(...auth.requireAuthAndWorkspace(), auth.attachAssetsProjectsContext);
  api.use('/assets', assetRoutes);
  api.use('/projects', projectRoutes);
  api.use('/agent', createAuraAgentRouter(pool));
  api.use('/agent', createCampaignBriefRouter(pool));
  api.use('/agent', createCampaignContentRouter(pool));
  api.use('/agent', createCreativeDirectionRouter(pool));
  app.use('/api', api);
}
