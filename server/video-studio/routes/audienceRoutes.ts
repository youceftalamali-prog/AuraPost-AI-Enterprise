import { Router } from 'express';
import { audienceController } from '../controllers/AudienceController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { createAudienceSchema, idParamSchema } from '../validation/audienceSchemas.js';

const router = Router();

router.get(
  '/',
  limits.standard,
  asyncHandler((req, res) => audienceController.list(req).then((data) => res.json(data)))
);

router.post(
  '/',
  limits.sensitive,
  validate(createAudienceSchema),
  asyncHandler((req, res) => audienceController.create(req).then((data) => res.json(data)))
);

router.get(
  '/:id',
  limits.standard,
  validate(idParamSchema),
  asyncHandler((req, res) => audienceController.getById(req).then((data) => res.json(data)))
);

router.put(
  '/:id',
  limits.sensitive,
  validate(idParamSchema),
  asyncHandler((req, res) => audienceController.update(req).then((data) => res.json(data)))
);

router.post(
  '/:id/analyze',
  limits.generate,
  validate(idParamSchema),
  asyncHandler((req, res) => audienceController.analyze(req).then((data) => res.json(data)))
);

router.delete(
  '/:id',
  limits.sensitive,
  validate(idParamSchema),
  asyncHandler((req, res) => audienceController.remove(req).then((data) => res.json(data)))
);

export default router;