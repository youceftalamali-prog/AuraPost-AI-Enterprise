/**
 * Assets Routes - Main Router
 * Aggregates all asset-related routes
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import assetRoutes from './asset.routes';

const router = Router();

// Mount all asset routes
router.use('/', assetRoutes);

export default router;