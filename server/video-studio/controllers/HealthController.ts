import type { Request, Response } from 'express';
import { livenessHandler, readinessHandler, diagnosticsHandler, metricsHandler } from '../utils/healthCheck.js';

/**
 * Thin controller wiring the health/metrics utilities to routes.
 */
export class HealthController {
  liveness(req: Request, res: Response): void {
    livenessHandler(req, res);
  }

  async readiness(req: Request, res: Response): Promise<void> {
    await readinessHandler(req, res);
  }

  async diagnostics(req: Request, res: Response): Promise<void> {
    await diagnosticsHandler(req, res);
  }

  metrics(req: Request, res: Response): void {
    metricsHandler(req, res);
  }
}

export const healthController = new HealthController();