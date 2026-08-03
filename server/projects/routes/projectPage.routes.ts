/**
 * Project Page Routes
 * REST API endpoints for project page management
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import { ProjectPageController } from '../controllers/ProjectPageController';

const router = Router();

/**
 * @swagger
 * /api/projects/{id}/pages:
 *   get:
 *     summary: List all pages for a project
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/projects/:id/pages', ProjectPageController.listPages);

/**
 * @swagger
 * /api/projects/{id}/pages:
 *   post:
 *     summary: Create a new page
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/projects/:id/pages', ProjectPageController.createPage);

/**
 * @swagger
 * /api/pages/{id}:
 *   get:
 *     summary: Get page by ID
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/pages/:id', ProjectPageController.getPage);

/**
 * @swagger
 * /api/pages/{id}:
 *   put:
 *     summary: Update page
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/pages/:id', ProjectPageController.updatePage);

/**
 * @swagger
 * /api/pages/{id}:
 *   delete:
 *     summary: Delete page
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/pages/:id', ProjectPageController.deletePage);

/**
 * @swagger
 * /api/pages/reorder:
 *   post:
 *     summary: Reorder pages
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/pages/reorder', ProjectPageController.reorderPages);

/**
 * @swagger
 * /api/pages/{id}/duplicate:
 *   post:
 *     summary: Duplicate page
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/pages/:id/duplicate', ProjectPageController.duplicatePage);

/**
 * @swagger
 * /api/pages/{id}/thumbnail:
 *   post:
 *     summary: Update page thumbnail
 *     tags: [Project Pages]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/pages/:id/thumbnail', ProjectPageController.updateThumbnail);

export default router;