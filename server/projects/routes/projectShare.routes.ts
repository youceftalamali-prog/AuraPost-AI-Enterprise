/**
 * Project Share Routes
 * REST API endpoints for project sharing and collaboration
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import { ProjectShareController } from '../controllers/ProjectShareController';

const router = Router();

/**
 * @swagger
 * /api/projects/{id}/shares:
 *   get:
 *     summary: List all shares for a project
 *     tags: [Project Shares]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/projects/:id/shares', ProjectShareController.listShares);

/**
 * @swagger
 * /api/projects/{id}/share:
 *   post:
 *     summary: Share project (user, workspace, or public link)
 *     tags: [Project Shares]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/projects/:id/share', ProjectShareController.shareProject);

/**
 * @swagger
 * /api/shares/{id}:
 *   patch:
 *     summary: Update share permission or expiration
 *     tags: [Project Shares]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/shares/:id', ProjectShareController.updateShare);

/**
 * @swagger
 * /api/shares/{id}:
 *   delete:
 *     summary: Revoke a share
 *     tags: [Project Shares]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/shares/:id', ProjectShareController.revokeShare);

/**
 * @swagger
 * /api/share/{token}:
 *   get:
 *     summary: Validate share token (public endpoint)
 *     tags: [Project Shares]
 */
router.get('/share/:token', ProjectShareController.validateShareToken);

/**
 * @swagger
 * /api/shares/my-shares:
 *   get:
 *     summary: Get shares created by current user
 *     tags: [Project Shares]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/shares/my-shares', ProjectShareController.getMyShares);

/**
 * @swagger
 * /api/shares/shared-with-me:
 *   get:
 *     summary: Get projects shared with current user
 *     tags: [Project Shares]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/shares/shared-with-me', ProjectShareController.getSharedWithMe);

export default router;