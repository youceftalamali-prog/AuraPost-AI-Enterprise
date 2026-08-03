import { Router } from 'express';
import { templateController } from '../controllers/TemplateController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  templateSearchSchema,
  templateIdSchema,
  templateCategorySchema,
  productIdParamSchema,
} from '../validation/templateSchemas.js';

const router = Router();

// Static routes first (before /:id)
router.get(
  '/',
  limits.standard,
  validate(templateSearchSchema),
  asyncHandler((req, res) => templateController.search(req).then((data) => res.json(data)))
);

router.get(
  '/categories',
  limits.standard,
  asyncHandler((req, res) => templateController.getCategories(req).then((data) => res.json(data)))
);

router.get(
  '/trending',
  limits.standard,
  asyncHandler((req, res) => templateController.getTrending(req).then((data) => res.json(data)))
);

router.get(
  '/newest',
  limits.standard,
  asyncHandler((req, res) => templateController.getNewest(req).then((data) => res.json(data)))
);

router.get(
  '/favorites',
  limits.standard,
  asyncHandler((req, res) => templateController.listFavorites(req).then((data) => res.json(data)))
);

router.get(
  '/recommended/:productId',
  limits.standard,
  validate(productIdParamSchema),
  asyncHandler((req, res) => templateController.getRecommended(req).then((data) => res.json(data)))
);

router.get(
  '/category/:category',
  limits.standard,
  validate(templateCategorySchema),
  asyncHandler((req, res) => templateController.getByCategory(req).then((data) => res.json(data)))
);

router.get(
  '/:id',
  limits.standard,
  validate(templateIdSchema),
  asyncHandler((req, res) => templateController.getById(req).then((data) => res.json(data)))
);

router.post(
  '/:id/favorite',
  limits.standard,
  validate(templateIdSchema),
  asyncHandler((req, res) => templateController.toggleFavorite(req).then((data) => res.json(data)))
);

export default router;