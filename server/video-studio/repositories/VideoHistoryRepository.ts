import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { videoHistory } from '../db/schema/videoHistory.js';
import type { VideoHistoryRecord, NewVideoHistoryRecord } from '../types/entities.js';

export interface HistoryQuery {
  userId: string;
  workspaceId: string;
  favoriteOnly?: boolean;
  platform?: string;
  limit?: number;
  offset?: number;
}

export class VideoHistoryRepository {
  async findById(id: string): Promise<VideoHistoryRecord | null> {
    const [row] = await db.select().from(videoHistory).where(eq(videoHistory.id, id)).limit(1);
    return row ?? null;
  }

  async query(params: HistoryQuery): Promise<{ items: VideoHistoryRecord[]; total: number }> {
    const conditions = [
      eq(videoHistory.userId, params.userId),
      eq(videoHistory.workspaceId, params.workspaceId),
    ];
    if (params.favoriteOnly) conditions.push(eq(videoHistory.isFavorite, true));
    if (params.platform) conditions.push(eq(videoHistory.platform, params.platform));

    const where = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(videoHistory)
      .where(where);

    const items = await db
      .select()
      .from(videoHistory)
      .where(where)
      .orderBy(desc(videoHistory.createdAt))
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0);

    return { items, total: countRow?.count ?? 0 };
  }

  async findByJobId(jobId: string): Promise<VideoHistoryRecord | null> {
    const [row] = await db.select().from(videoHistory).where(eq(videoHistory.jobId, jobId)).limit(1);
    return row ?? null;
  }

  async create(data: NewVideoHistoryRecord): Promise<VideoHistoryRecord> {
    const [row] = await db.insert(videoHistory).values(data).returning();
    return row;
  }

  async toggleFavorite(id: string, userId: string): Promise<VideoHistoryRecord | null> {
    const current = await this.findById(id);
    if (!current || current.userId !== userId) return null;
    const updateData = { isFavorite: !current.isFavorite };
    const [row] = await db
      .update(videoHistory)
      .set(updateData as any)
      .where(eq(videoHistory.id, id))
      .returning();
    return row ?? null;
  }

  async markPublished(id: string): Promise<void> {
    const updateData = { isPublished: true, publishedAt: new Date() };
    await db
      .update(videoHistory)
      .set(updateData as any)
      .where(eq(videoHistory.id, id));
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const [row] = await db
      .delete(videoHistory)
      .where(and(eq(videoHistory.id, id), eq(videoHistory.userId, userId)))
      .returning({ id: videoHistory.id });
    return !!row;
  }
}

export const videoHistoryRepository = new VideoHistoryRepository();