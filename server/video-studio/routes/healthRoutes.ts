import { Router } from 'express';
import { healthController } from '../controllers/HealthController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/health', (req, res) => healthController.liveness(req, res));
router.get('/health/ready', asyncHandler((req, res) => healthController.readiness(req, res)));
router.get('/health/diagnostics', asyncHandler((req, res) => healthController.diagnostics(req, res)));
router.get('/metrics', (req, res) => healthController.metrics(req, res));

export default router;