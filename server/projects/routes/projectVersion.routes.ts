/**
 * Project Version Routes
 * REST API endpoints for project version history
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import { ProjectVersionController } from '../controllers/ProjectVersionController';

const router = Router();

/**
 * @swagger
 * /api/projects/{id}/versions:
 *   get:
 *     summary: List version history for a project
 *     tags: [Project Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/projects/:id/versions', ProjectVersionController.listVersions);

/**
 * @swagger
 * /api/projects/{id}/versions:
 *   post:
 *     summary: Create a new version snapshot
 *     tags: [Project Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/projects/:id/versions', ProjectVersionController.createVersion);

/**
 * @swagger
 * /api/versions/{id}:
 *   get:
 *     summary: Get a specific version
 *     tags: [Project Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/versions/:id', ProjectVersionController.getVersion);

/**
 * @swagger
 * /api/versions/{id}/restore:
 *   post:
 *     summary: Restore a version
 *     tags: [Project Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/versions/:id/restore', ProjectVersionController.restoreVersion);

/**
 * @swagger
 * /api/versions/{id}:
 *   delete:
 *     summary: Delete a version
 *     tags: [Project Versions]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/versions/:id', ProjectVersionController.deleteVersion);

export default router;