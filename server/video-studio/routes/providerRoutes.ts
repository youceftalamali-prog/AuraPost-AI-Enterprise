import { Router } from 'express';
import { providerController } from '../controllers/ProviderController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  compareCostSchema,
  selectProviderSchema,
  updateProviderSettingsSchema,
  testProviderSchema,
  providerParamSchema,
} from '../validation/providerSchemas.js';

const router = Router();

// Static routes first (before /:provider)
router.get(
  '/',
  limits.standard,
  asyncHandler((req, res) => providerController.list(req).then((data) => res.json(data)))
);

router.get(
  '/health',
  limits.health,
  asyncHandler((req, res) => providerController.getHealth(req).then((data) => res.json(data)))
);

router.get(
  '/statistics',
  limits.standard,
  asyncHandler((req, res) => providerController.getStatistics(req).then((data) => res.json(data)))
);

router.get(
  '/settings',
  limits.standard,
  asyncHandler((req, res) => providerController.getSettings(req).then((data) => res.json(data)))
);

router.put(
  '/settings',
  limits.sensitive,
  validate(updateProviderSettingsSchema),
  asyncHandler((req, res) => providerController.updateSettings(req).then((data) => res.json(data)))
);

router.post(
  '/compare',
  limits.standard,
  validate(compareCostSchema),
  asyncHandler((req, res) => providerController.compareCost(req).then((data) => res.json(data)))
);

router.post(
  '/select',
  limits.standard,
  validate(selectProviderSchema),
  asyncHandler((req, res) => providerController.select(req).then((data) => res.json(data)))
);

router.post(
  '/test',
  limits.sensitive,
  validate(testProviderSchema),
  asyncHandler((req, res) => providerController.test(req).then((data) => res.json(data)))
);

router.get(
  '/:provider/health',
  limits.health,
  validate(providerParamSchema),
  asyncHandler((req, res) => providerController.getProviderHealth(req).then((data) => res.json(data)))
);

router.get(
  '/:provider/statistics',
  limits.standard,
  validate(providerParamSchema),
  asyncHandler((req, res) => providerController.getStatistics(req).then((data) => res.json(data)))
);

export default router;