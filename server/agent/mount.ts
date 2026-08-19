import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import {
  AgentContractError,
  initialStepForSource,
  normalizeAgentWorkflowCreate,
  normalizeAgentWorkflowPatch,
  normalizeIdempotencyKey,
} from './contracts';
import { createAuraAgentChatRouter } from './agentChatRouter';

const AGENT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS aura_agent_workflows (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_mode TEXT NOT NULL,
  locale TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  template_id TEXT,
  product_id TEXT,
  market_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  creative_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  idempotency_key TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_workflow_idempotency
  ON aura_agent_workflows(workspace_id, user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aura_workflow_active
  ON aura_agent_workflows(workspace_id, user_id, status, updated_at DESC);
`;

type AuthenticatedRequest = Request & {
  workspaceId?: string;
  user?: { userId?: string };
};

interface WorkflowRow {
  id: string;
  workspace_id: string;
  user_id: string;
  source_mode: string;
  locale: string;
  prompt: string;
  template_id: string | null;
  product_id: string | null;
  market_context: Record<string, unknown>;
  creative_context: Record<string, unknown>;
  current_step: string;
  status: string;
  version: number;
  created_at: Date | string;
  updated_at: Date | string;
}

function serialize(row: WorkflowRow) {
  return {
    id: row.id,
    sourceMode: row.source_mode,
    locale: row.locale,
    prompt: row.prompt,
    templateId: row.template_id,
    productId: row.product_id,
    marketContext: row.market_context || {},
    creativeContext: row.creative_context || {},
    currentStep: row.current_step,
    status: row.status,
    version: row.version,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function authContext(req: AuthenticatedRequest) {
  const workspaceId = req.workspaceId;
  const userId = req.user?.userId;
  if (!workspaceId || !userId) {
    throw new AgentContractError('AGENT_AUTH_CONTEXT_MISSING', 'Authenticated workspace context is required.');
  }
  return { workspaceId, userId };
}

function sendContractError(res: Response, error: unknown) {
  if (error instanceof AgentContractError) {
    return res.status(error.code === 'AGENT_AUTH_CONTEXT_MISSING' ? 401 : 400).json({ error: error.message, code: error.code });
  }
  throw error;
}

async function assertProductAccess(pool: Pool, workspaceId: string, productId?: string | null) {
  if (!productId) return;
  const result = await pool.query('SELECT 1 FROM products WHERE id = $1 AND workspace_id = $2 LIMIT 1', [productId, workspaceId]);
  if (result.rowCount === 0) {
    throw new AgentContractError('AGENT_PRODUCT_NOT_FOUND', 'Product was not found in this workspace.');
  }
}

export function createAuraAgentRouter(pool: Pool): Router {
  const router = Router();
  const schemaReady = pool.query(AGENT_SCHEMA_SQL);
  router.use(async (_req, _res, next) => {
    try {
      await schemaReady;
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/workflows/active', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const result = await pool.query<WorkflowRow>(
        `SELECT * FROM aura_agent_workflows
         WHERE workspace_id = $1 AND user_id = $2 AND status IN ('active', 'paused')
         ORDER BY updated_at DESC LIMIT 1`,
        [workspaceId, userId],
      );
      return res.json({ workflow: result.rows[0] ? serialize(result.rows[0]) : null });
    } catch (error) {
      return sendContractError(res, error);
    }
  });

  router.get('/workflows/:workflowId', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const result = await pool.query<WorkflowRow>(
        'SELECT * FROM aura_agent_workflows WHERE id = $1 AND workspace_id = $2 AND user_id = $3 LIMIT 1',
        [req.params.workflowId, workspaceId, userId],
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Aura workflow not found.', code: 'AGENT_WORKFLOW_NOT_FOUND' });
      return res.json({ workflow: serialize(result.rows[0]) });
    } catch (error) {
      return sendContractError(res, error);
    }
  });

  router.post('/workflows', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const input = normalizeAgentWorkflowCreate(req.body);
      const idempotencyKey = normalizeIdempotencyKey(req.header('Idempotency-Key'));
      if (idempotencyKey) {
        const replay = await pool.query<WorkflowRow>(
          'SELECT * FROM aura_agent_workflows WHERE workspace_id = $1 AND user_id = $2 AND idempotency_key = $3 LIMIT 1',
          [workspaceId, userId, idempotencyKey],
        );
        if (replay.rows[0]) {
          res.setHeader('Idempotency-Replayed', 'true');
          return res.json({ workflow: serialize(replay.rows[0]) });
        }
      }
      await assertProductAccess(pool, workspaceId, input.productId);
      const result = await pool.query<WorkflowRow>(
        `INSERT INTO aura_agent_workflows (
          id, workspace_id, user_id, source_mode, locale, prompt, template_id,
          product_id, current_step, status, idempotency_key
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)
        RETURNING *`,
        [
          crypto.randomUUID(), workspaceId, userId, input.sourceMode, input.locale,
          input.prompt, input.templateId || null, input.productId || null,
          initialStepForSource(input.sourceMode), idempotencyKey || null,
        ],
      );
      return res.status(201).json({ workflow: serialize(result.rows[0]) });
    } catch (error) {
      return sendContractError(res, error);
    }
  });

  router.patch('/workflows/:workflowId', async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, userId } = authContext(req);
      const patch = normalizeAgentWorkflowPatch(req.body);
      await assertProductAccess(pool, workspaceId, patch.productId);
      const result = await pool.query<WorkflowRow>(
        `UPDATE aura_agent_workflows SET
          prompt = COALESCE($5, prompt),
          template_id = CASE WHEN $6 THEN $7 ELSE template_id END,
          product_id = CASE WHEN $8 THEN $9 ELSE product_id END,
          locale = COALESCE($10, locale),
          current_step = COALESCE($11, current_step),
          status = COALESCE($12, status),
          market_context = COALESCE($13::jsonb, market_context),
          creative_context = COALESCE($14::jsonb, creative_context),
          version = version + 1,
          updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND user_id = $3 AND version = $4
        RETURNING *`,
        [
          req.params.workflowId, workspaceId, userId, patch.expectedVersion,
          patch.prompt ?? null,
          patch.templateId !== undefined, patch.templateId ?? null,
          patch.productId !== undefined, patch.productId ?? null,
          patch.locale ?? null, patch.currentStep ?? null, patch.status ?? null,
          patch.marketContext === undefined ? null : JSON.stringify(patch.marketContext),
          patch.creativeContext === undefined ? null : JSON.stringify(patch.creativeContext),
        ],
      );
      if (result.rows[0]) return res.json({ workflow: serialize(result.rows[0]) });
      const exists = await pool.query(
        'SELECT version FROM aura_agent_workflows WHERE id = $1 AND workspace_id = $2 AND user_id = $3 LIMIT 1',
        [req.params.workflowId, workspaceId, userId],
      );
      if (exists.rowCount === 0) return res.status(404).json({ error: 'Aura workflow not found.', code: 'AGENT_WORKFLOW_NOT_FOUND' });
      return res.status(409).json({ error: 'Aura workflow changed in another request. Reload and retry.', code: 'AGENT_WORKFLOW_VERSION_CONFLICT', currentVersion: exists.rows[0].version });
    } catch (error) {
      return sendContractError(res, error);
    }
  });

  router.use(createAuraAgentChatRouter(pool));

  return router;
}
