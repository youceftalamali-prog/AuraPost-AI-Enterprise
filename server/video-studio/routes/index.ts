import { Router } from 'express';
import productRoutes from './productRoutes.js';
import templateRoutes from './templateRoutes.js';
import brandRoutes from './brandRoutes.js';
import audienceRoutes from './audienceRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import promptRoutes from './promptRoutes.js';
import providerRoutes from './providerRoutes.js';
import videoRoutes from './videoRoutes.js';
import healthRoutes from './healthRoutes.js';
import { securityHeaders, requestGuard, csrfProtection } from '../middleware/security.js';
import { limits } from '../middleware/rateLimit.js';

/**
 * Mounts every Video Studio route group under /api/video and the
 * health/metrics endpoints at the root. Security middleware is applied
 * to the whole /api/video surface.
 */
export function registerRoutes(app: Router): void {
  // Health & metrics (no auth, generous limits)
  app.use('/', healthRoutes);

  // Video Studio API surface
  const api = Router();
  api.use(securityHeaders);
  api.use(requestGuard);
  api.use(csrfProtection);
  api.use(limits.standard);

  api.use('/products', productRoutes);
  api.use('/templates', templateRoutes);
  api.use('/brands', brandRoutes);
  api.use('/audiences', audienceRoutes);
  api.use('/campaigns', campaignRoutes);
  api.use('/prompts', promptRoutes);
  api.use('/providers', providerRoutes);
  api.use('/', videoRoutes);

  app.use('/api/video', api);
}

export {
  productRoutes,
  templateRoutes,
  brandRoutes,
  audienceRoutes,
  campaignRoutes,
  promptRoutes,
  providerRoutes,
  videoRoutes,
  healthRoutes,
};