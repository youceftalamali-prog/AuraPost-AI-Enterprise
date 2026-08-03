import { Router } from 'express';
import { campaignController } from '../controllers/CampaignController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema, generateCampaignSchema, idParamSchema } from '../validation/campaignSchemas.js';

const router = Router();

router.get(
  '/',
  limits.standard,
  asyncHandler((req, res) => campaignController.list(req).then((data) => res.json(data)))
);

router.post(
  '/',
  limits.sensitive,
  validate(createCampaignSchema),
  asyncHandler((req, res) => campaignController.create(req).then((data) => res.json(data)))
);

router.get(
  '/:id',
  limits.standard,
  validate(idParamSchema),
  asyncHandler((req, res) => campaignController.getById(req).then((data) => res.json(data)))
);

router.post(
  '/:id/generate',
  limits.generate,
  validate(generateCampaignSchema),
  asyncHandler((req, res) => campaignController.generate(req).then((data) => res.json(data)))
);

router.get(
  '/:id/generations',
  limits.standard,
  validate(idParamSchema),
  asyncHandler((req, res) => campaignController.getGenerations(req).then((data) => res.json(data)))
);

router.delete(
  '/:id',
  limits.sensitive,
  validate(idParamSchema),
  asyncHandler((req, res) => campaignController.remove(req).then((data) => res.json(data)))
);

export default router;