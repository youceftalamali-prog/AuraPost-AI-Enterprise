/**
 * Project Search Routes
 * REST API endpoints for advanced project search
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import { ProjectSearchController } from '../controllers/ProjectSearchController';

const router = Router();

/**
 * @swagger
 * /api/projects/search:
 *   get:
 *     summary: Advanced search with filters
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search', ProjectSearchController.search);

/**
 * @swagger
 * /api/projects/search/fulltext:
 *   get:
 *     summary: Full text search
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/fulltext', ProjectSearchController.fullTextSearch);

/**
 * @swagger
 * /api/projects/search/by-tags:
 *   get:
 *     summary: Search by tags
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-tags', ProjectSearchController.searchByTags);

/**
 * @swagger
 * /api/projects/search/by-date:
 *   get:
 *     summary: Search by date range
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-date', ProjectSearchController.searchByDate);

/**
 * @swagger
 * /api/projects/search/by-status:
 *   get:
 *     summary: Search by status
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-status', ProjectSearchController.searchByStatus);

/**
 * @swagger
 * /api/projects/search/published:
 *   get:
 *     summary: Get published projects
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/published', ProjectSearchController.getPublished);

/**
 * @swagger
 * /api/projects/search/by-user:
 *   get:
 *     summary: Get projects by user
 *     tags: [Project Search]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search/by-user', ProjectSearchController.getByUser);

export default router;