import type { Express } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';

import { initAssetsProjectsDb } from './database/index';
import assetRoutes from './assets/routes/index';
import projectRoutes from './projects/routes/index';
import { createAuraAgentRouter } from './agent/mount';

export interface AssetsProjectsAuthMiddleware {
  requireAuthAndWorkspace: () => Array<(req: any, res: any, next: any) => any>;
  attachAssetsProjectsContext: (req: any, res: any, next: any) => any;
}

/**
 * Wires the Assets, Projects, and persistent Aura Agent workflow modules into
 * AuraPost's existing Express app. All routes reuse the shared PostgreSQL pool
 * and the established authenticated user/workspace context.
 */
export function mountAssetsProjects(app: Express, pool: Pool, auth: AssetsProjectsAuthMiddleware): void {
  initAssetsProjectsDb(pool);

  const api = Router();
  api.use(...auth.requireAuthAndWorkspace(), auth.attachAssetsProjectsContext);

  api.use('/assets', assetRoutes);
  api.use('/projects', projectRoutes);
  api.use('/agent', createAuraAgentRouter(pool));

  app.use('/api', api);
}
