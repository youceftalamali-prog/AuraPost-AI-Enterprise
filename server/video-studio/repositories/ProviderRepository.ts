import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  videoProviders,
  providerStatistics,
  providerHealth,
  providerJobs,
  providerCosts,
  providerSettings,
} from '../db/schema/providers.js';
import type {
  VideoProviderRecord,
  NewVideoProviderRecord,
  ProviderStatisticsRecord,
  ProviderHealthRecord,
  ProviderJobRecord,
  NewProviderJobRecord,
  ProviderCostRecord,
  NewProviderCostRecord,
  ProviderSettingsRecord,
  NewProviderSettingsRecord,
} from '../types/entities.js';
import type { VideoProviderName, VideoJobStatus } from '../types/video.js';

export interface JobQuery {
  userId: string;
  workspaceId: string;
  status?: VideoJobStatus;
  provider?: VideoProviderName;
  limit?: number;
  offset?: number;
}

export class ProviderRepository {
  // ---------- video_providers ----------
  async findProviderByName(name: VideoProviderName): Promise<VideoProviderRecord | null> {
    const [row] = await db.select().from(videoProviders).where(eq(videoProviders.name, name)).limit(1);
    return row ?? null;
  }

  async findAllProviders(activeOnly = true): Promise<VideoProviderRecord[]> {
    return db
      .select()
      .from(videoProviders)
      .where(activeOnly ? eq(videoProviders.isActive, true) : undefined)
      .orderBy(sql`${videoProviders.priority} ASC`);
  }

  async upsertProvider(data: NewVideoProviderRecord): Promise<VideoProviderRecord> {
    const updateData = { ...data, updatedAt: new Date() };
    const [row] = await db
      .insert(videoProviders)
      .values(data)
      .onConflictDoUpdate({ target: videoProviders.name, set: updateData })
      .returning();
    return row;
  }

  // ---------- provider_statistics ----------
  async findStatistics(provider: string, period = 'all'): Promise<ProviderStatisticsRecord | null> {
    const [row] = await db
      .select()
      .from(providerStatistics)
      .where(and(eq(providerStatistics.provider, provider), eq(providerStatistics.period, period)))
      .limit(1);
    return row ?? null;
  }

  async findAllStatistics(period = 'all'): Promise<ProviderStatisticsRecord[]> {
    return db.select().from(providerStatistics).where(eq(providerStatistics.period, period));
  }

  async upsertStatistics(
    provider: string,
    period: string,
    data: Omit<Partial<ProviderStatisticsRecord>, 'id' | 'provider' | 'period'>
  ): Promise<ProviderStatisticsRecord> {
    const existing = await this.findStatistics(provider, period);
    if (existing) {
      const updateData = { ...data, updatedAt: new Date() };
      const [row] = await db
        .update(providerStatistics)
        .set(updateData as any)
        .where(eq(providerStatistics.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(providerStatistics)
      .values({ provider, period, ...data } as ProviderStatisticsRecord)
      .returning();
    return row;
  }

  // ---------- provider_health ----------
  async findHealth(provider: string): Promise<ProviderHealthRecord | null> {
    const [row] = await db.select().from(providerHealth).where(eq(providerHealth.provider, provider)).limit(1);
    return row ?? null;
  }

  async findAllHealth(): Promise<ProviderHealthRecord[]> {
    return db.select().from(providerHealth);
  }

  async upsertHealth(
    provider: string,
    data: Omit<Partial<ProviderHealthRecord>, 'id' | 'provider'>
  ): Promise<ProviderHealthRecord> {
    const existing = await this.findHealth(provider);
    if (existing) {
      const updateData = { ...data, lastChecked: new Date() };
      const [row] = await db
        .update(providerHealth)
        .set(updateData as any)
        .where(eq(providerHealth.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(providerHealth)
      .values({ provider, ...data } as ProviderHealthRecord)
      .returning();
    return row;
  }

  // ---------- provider_jobs ----------
  async findJobById(id: string): Promise<ProviderJobRecord | null> {
    const [row] = await db.select().from(providerJobs).where(eq(providerJobs.id, id)).limit(1);
    return row ?? null;
  }

  async queryJobs(params: JobQuery): Promise<{ items: ProviderJobRecord[]; total: number }> {
    const conditions = [
      eq(providerJobs.userId, params.userId),
      eq(providerJobs.workspaceId, params.workspaceId),
    ];
    if (params.status) conditions.push(eq(providerJobs.status, params.status));
    if (params.provider) conditions.push(eq(providerJobs.provider, params.provider));

    const where = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(providerJobs)
      .where(where);

    const items = await db
      .select()
      .from(providerJobs)
      .where(where)
      .orderBy(desc(providerJobs.createdAt))
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0);

    return { items, total: countRow?.count ?? 0 };
  }

  async findPendingJobs(limit = 10): Promise<ProviderJobRecord[]> {
    return db
      .select()
      .from(providerJobs)
      .where(eq(providerJobs.status, 'Queued'))
      .orderBy(sql`${providerJobs.priority} DESC, ${providerJobs.createdAt} ASC`)
      .limit(limit);
  }

  async createJob(data: NewProviderJobRecord): Promise<ProviderJobRecord> {
    const [row] = await db.insert(providerJobs).values(data).returning();
    return row;
  }

  async updateJob(id: string, data: Partial<NewProviderJobRecord>): Promise<ProviderJobRecord | null> {
    const [row] = await db.update(providerJobs).set(data).where(eq(providerJobs.id, id)).returning();
    return row ?? null;
  }

  async updateJobStatus(id: string, status: VideoJobStatus, extra: Partial<NewProviderJobRecord> = {}): Promise<ProviderJobRecord | null> {
    const updates: Partial<NewProviderJobRecord> = { ...extra, status };
    if (status === 'Processing' || status === 'Rendering' || status === 'Analyzing') {
      updates.startedAt = new Date();
    }
    if (status === 'Completed' || status === 'Failed' || status === 'Cancelled') {
      updates.completedAt = new Date();
    }
    const [row] = await db.update(providerJobs).set(updates).where(eq(providerJobs.id, id)).returning();
    return row ?? null;
  }

  async incrementJobRetry(id: string): Promise<number> {
    const updateData = { retryCount: sql`${providerJobs.retryCount} + 1` };
    const [row] = await db
      .update(providerJobs)
      .set(updateData as any)
      .where(eq(providerJobs.id, id))
      .returning({ retryCount: providerJobs.retryCount });
    return row?.retryCount ?? 0;
  }

  // ---------- provider_costs ----------
  async createCost(data: NewProviderCostRecord): Promise<ProviderCostRecord> {
    const [row] = await db.insert(providerCosts).values(data).returning();
    return row;
  }

  async findCostsByWorkspace(workspaceId: string, limit = 100): Promise<ProviderCostRecord[]> {
    return db
      .select()
      .from(providerCosts)
      .where(eq(providerCosts.workspaceId, workspaceId))
      .orderBy(desc(providerCosts.createdAt))
      .limit(limit);
  }

  // ---------- provider_settings ----------
  async findSettings(workspaceId: string): Promise<ProviderSettingsRecord | null> {
    const [row] = await db.select().from(providerSettings).where(eq(providerSettings.workspaceId, workspaceId)).limit(1);
    return row ?? null;
  }

  async upsertSettings(
    workspaceId: string,
    data: Partial<NewProviderSettingsRecord>
  ): Promise<ProviderSettingsRecord> {
    const existing = await this.findSettings(workspaceId);
    if (existing) {
      const updateData = { ...data, updatedAt: new Date() };
      const [row] = await db
        .update(providerSettings)
        .set(updateData as any)
        .where(eq(providerSettings.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(providerSettings)
      .values({ workspaceId, ...data } as ProviderSettingsRecord)
      .returning();
    return row;
  }
}

export const providerRepository = new ProviderRepository();