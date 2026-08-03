import { Router } from 'express';
import { videoGenerationController } from '../controllers/VideoGenerationController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  generateVideoSchema,
  listJobsSchema,
  jobIdParamSchema,
  listHistorySchema,
  historyIdParamSchema,
} from '../validation/videoSchemas.js';

const router = Router();

// Generation
router.post(
  '/generate',
  limits.generate,
  validate(generateVideoSchema),
  asyncHandler((req, res) => videoGenerationController.generate(req).then((data) => res.json(data)))
);

// Jobs
router.get(
  '/jobs',
  limits.standard,
  validate(listJobsSchema),
  asyncHandler((req, res) => videoGenerationController.listJobs(req).then((data) => res.json(data)))
);

router.get(
  '/jobs/:id',
  limits.standard,
  validate(jobIdParamSchema),
  asyncHandler((req, res) => videoGenerationController.getJob(req).then((data) => res.json(data)))
);

router.post(
  '/jobs/:id/cancel',
  limits.standard,
  validate(jobIdParamSchema),
  asyncHandler((req, res) => videoGenerationController.cancelJob(req).then((data) => res.json(data)))
);

router.post(
  '/jobs/:id/retry',
  limits.standard,
  validate(jobIdParamSchema),
  asyncHandler((req, res) => videoGenerationController.retryJob(req).then((data) => res.json(data)))
);

// History
router.get(
  '/history',
  limits.standard,
  validate(listHistorySchema),
  asyncHandler((req, res) => videoGenerationController.listHistory(req).then((data) => res.json(data)))
);

router.delete(
  '/history/:id',
  limits.sensitive,
  validate(historyIdParamSchema),
  asyncHandler((req, res) => videoGenerationController.deleteHistory(req).then((data) => res.json(data)))
);

router.post(
  '/history/:id/favorite',
  limits.standard,
  validate(historyIdParamSchema),
  asyncHandler((req, res) => videoGenerationController.toggleHistoryFavorite(req).then((data) => res.json(data)))
);

export default router;