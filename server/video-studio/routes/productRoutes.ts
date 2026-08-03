import { Router } from 'express';
import { productIntelligenceController } from '../controllers/ProductIntelligenceController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { limits } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { analyzeProductSchema } from '../validation/productSchemas.js';

const router = Router();

router.post(
  '/:productId/analyze',
  limits.generate,
  validate(analyzeProductSchema),
  asyncHandler((req, res) => productIntelligenceController.analyze(req).then((data) => res.json(data)))
);

router.get(
  '/:productId/analysis',
  limits.standard,
  asyncHandler((req, res) => productIntelligenceController.getAnalysis(req).then((data) => res.json(data)))
);

export default router;