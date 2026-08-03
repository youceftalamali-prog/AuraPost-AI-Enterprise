import type { Express } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';

import { initAssetsProjectsDb } from './database/index';
import assetRoutes from './assets/routes/index';
import projectRoutes from './projects/routes/index';

export interface AssetsProjectsAuthMiddleware {
  requireAuthAndWorkspace: () => Array<(req: any, res: any, next: any) => any>;
  attachAssetsProjectsContext: (req: any, res: any, next: any) => any;
}

/**
 * Wires the Assets and Projects modules (ported from Image Studio) into
 * AuraPost's existing Express app — mirrors server/video-studio/mount.ts:
 *
 * - Reuses AuraPost's existing pg Pool (initAssetsProjectsDb), no second
 *   connection.
 * - Reuses AuraPost's existing JWT/workspace auth rather than any
 *   module-local auth. Every /api/assets and /api/projects route requires
 *   a valid bearer token and verified workspace membership before it's
 *   reachable (previously: no auth at all — see AUDIT_REPORT.md, Issue #2).
 * - Mounted at /api/assets and /api/projects respectively.
 */
export function mountAssetsProjects(app: Express, pool: Pool, auth: AssetsProjectsAuthMiddleware): void {
  initAssetsProjectsDb(pool);

  const api = Router();
  api.use(...auth.requireAuthAndWorkspace(), auth.attachAssetsProjectsContext);

  api.use('/assets', assetRoutes);
  api.use('/projects', projectRoutes);

  app.use('/api', api);
}
