import { Router } from 'express';
import { promptController } from '../controllers/PromptController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { composePromptSchema, previewPromptSchema, variationsSchema } from '../validation/promptSchemas.js';

const router = Router();

router.post(
  '/compose',
  limits.generate,
  validate(composePromptSchema),
  asyncHandler((req, res) => promptController.compose(req).then((data) => res.json(data)))
);

router.post(
  '/preview',
  limits.standard,
  validate(previewPromptSchema),
  asyncHandler((req, res) => promptController.preview(req).then((data) => res.json(data)))
);

router.post(
  '/variations',
  limits.standard,
  validate(variationsSchema),
  asyncHandler((req, res) => promptController.variations(req).then((data) => res.json(data)))
);

export default router;