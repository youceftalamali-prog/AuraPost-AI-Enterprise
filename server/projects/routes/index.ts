/**
 * Projects Routes - Main Router
 * Aggregates all project-related routes
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import projectRoutes from './project.routes';
import projectPageRoutes from './projectPage.routes';
import projectVersionRoutes from './projectVersion.routes';
import projectShareRoutes from './projectShare.routes';
import projectSearchRoutes from './projectSearch.routes';

const router = Router();

// Mount all sub-routes
router.use('/', projectRoutes);
router.use('/', projectPageRoutes);
router.use('/', projectVersionRoutes);
router.use('/', projectShareRoutes);
router.use('/', projectSearchRoutes);

export default router;