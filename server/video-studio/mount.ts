import type { Express } from 'express';
import { Router } from 'express';
import type { Pool } from 'pg';

import { initVideoStudioDb } from './db/index.js';
import { validateEnv } from './utils/envValidator.js';
import { createVideoLogger } from './utils/videoLogger.js';
import { startCacheCleanup, stopCacheCleanup } from './cache/optimizedCache.js';
import { videoQueue } from './queue/VideoQueue.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { metrics } from './monitoring/metrics.js';

import healthRoutes from './routes/healthRoutes.js';
import productRoutes from './routes/productRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import audienceRoutes from './routes/audienceRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import promptRoutes from './routes/promptRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

const logger = createVideoLogger('Mount');

export interface VideoStudioAuthMiddleware {
  requireAuthAndWorkspace: () => Array<(req: any, res: any, next: any) => any>;
  attachVideoStudioContext: (req: any, res: any, next: any) => any;
}

/**
 * Wires the Video Studio module into AuraPost's existing Express app.
 *
 * - Reuses AuraPost's already-connected pg Pool (no second connection).
 * - Reuses AuraPost's existing auth (requireAuthAndWorkspace) rather than
 *   the module's own standalone CSRF/cookie-based security, which assumed
 *   a different (non-JWT-bearer) auth model and is not applied here.
 * - Mounts everything under /api/video, matching the module's frontend
 *   (src/video-studio/services/http.ts calls `/api/video/...`).
 * - Health/metrics endpoints are mounted at root, unauthenticated, as
 *   general app observability (no conflicts with any existing A route).
 */
export function mountVideoStudio(app: Express, pool: Pool, auth: VideoStudioAuthMiddleware): void {
  initVideoStudioDb(pool);

  const envResult = validateEnv();
  if (!envResult.valid) {
    logger.error('Video Studio environment validation failed', new Error(envResult.errors.join('; ')));
  }
  for (const warning of envResult.warnings) {
    logger.warn(warning);
  }

  // Unauthenticated health/metrics surface.
  app.use('/', healthRoutes);

  // Authenticated Video Studio API surface, mounted under /api/video.
  const api = Router();
  api.use(metrics.middleware());
  api.use(...auth.requireAuthAndWorkspace(), auth.attachVideoStudioContext);

  api.use('/products', productRoutes);
  api.use('/templates', templateRoutes);
  api.use('/brands', brandRoutes);
  api.use('/audiences', audienceRoutes);
  api.use('/campaigns', campaignRoutes);
  api.use('/prompts', promptRoutes);
  api.use('/providers', providerRoutes);
  api.use('/', videoRoutes);

  api.use(notFoundHandler);
  api.use(errorHandler);

  app.use('/api/video', api);

  startCacheCleanup();
  videoQueue.start();

  logger.info('Video Studio module mounted at /api/video');
}

export function shutdownVideoStudio(): void {
  stopCacheCleanup();
  videoQueue.stop();
}
