/**
 * Project Routes
 * REST API endpoints for project CRUD and lifecycle operations
 * Phase: 5.3 Part 5
 */

import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';

const router = Router();

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', ProjectController.createProject);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List projects with filters and pagination
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', ProjectController.listProjects);

/**
 * @swagger
 * /api/projects/search:
 *   get:
 *     summary: Advanced search with filters
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/search', ProjectController.searchProjects);

/**
 * @swagger
 * /api/projects/recent:
 *   get:
 *     summary: Get recent projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/recent', ProjectController.getRecentProjects);

/**
 * @swagger
 * /api/projects/favorites:
 *   get:
 *     summary: Get favorite projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/favorites', ProjectController.getFavoriteProjects);

/**
 * @swagger
 * /api/projects/archived:
 *   get:
 *     summary: Get archived projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/archived', ProjectController.getArchivedProjects);

/**
 * @swagger
 * /api/projects/trash:
 *   get:
 *     summary: Get trashed projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/trash', ProjectController.getTrashedProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', ProjectController.getProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', ProjectController.updateProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Soft delete project (move to trash)
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', ProjectController.deleteProject);

/**
 * @swagger
 * /api/projects/{id}/archive:
 *   post:
 *     summary: Archive project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/archive', ProjectController.archiveProject);

/**
 * @swagger
 * /api/projects/{id}/restore:
 *   post:
 *     summary: Restore project from trash
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/restore', ProjectController.restoreProject);

/**
 * @swagger
 * /api/projects/{id}/publish:
 *   post:
 *     summary: Publish project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/publish', ProjectController.publishProject);

/**
 * @swagger
 * /api/projects/{id}/favorite:
 *   post:
 *     summary: Toggle favorite
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/favorite', ProjectController.toggleFavorite);

/**
 * @swagger
 * /api/projects/{id}/lock:
 *   post:
 *     summary: Toggle lock
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/lock', ProjectController.toggleLock);

export default router;