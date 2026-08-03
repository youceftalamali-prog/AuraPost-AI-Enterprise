import { Router } from 'express';
import { brandController } from '../controllers/BrandController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { createBrandSchema, idParamSchema } from '../validation/brandSchemas.js';

const router = Router();

router.get(
  '/',
  limits.standard,
  asyncHandler((req, res) => brandController.list(req).then((data) => res.json(data)))
);

router.post(
  '/',
  limits.sensitive,
  validate(createBrandSchema),
  asyncHandler((req, res) => brandController.create(req).then((data) => res.json(data)))
);

router.get(
  '/:id',
  limits.standard,
  validate(idParamSchema),
  asyncHandler((req, res) => brandController.getById(req).then((data) => res.json(data)))
);

router.put(
  '/:id',
  limits.sensitive,
  validate(idParamSchema),
  asyncHandler((req, res) => brandController.update(req).then((data) => res.json(data)))
);

router.post(
  '/:id/analyze',
  limits.generate,
  validate(idParamSchema),
  asyncHandler((req, res) => brandController.analyze(req).then((data) => res.json(data)))
);

router.delete(
  '/:id',
  limits.sensitive,
  validate(idParamSchema),
  asyncHandler((req, res) => brandController.remove(req).then((data) => res.json(data)))
);

export default router;