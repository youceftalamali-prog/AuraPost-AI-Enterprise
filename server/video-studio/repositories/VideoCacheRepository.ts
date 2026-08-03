import { eq, and, lt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { videoCache } from '../db/schema/videoCache.js';
import type { VideoCacheRecord, NewVideoCacheRecord } from '../types/entities.js';

export class VideoCacheRepository {
  async findByHash(cacheHash: string): Promise<VideoCacheRecord | null> {
    const [row] = await db
      .select()
      .from(videoCache)
      .where(and(eq(videoCache.cacheHash, cacheHash), sql`(${videoCache.expiresAt} IS NULL OR ${videoCache.expiresAt} > NOW())`))
      .limit(1);
    return row ?? null;
  }

  async create(data: NewVideoCacheRecord): Promise<VideoCacheRecord> {
    const updateData = { ...data, lastUsedAt: new Date() };
    const [row] = await db
      .insert(videoCache)
      .values(data)
      .onConflictDoUpdate({ target: videoCache.cacheHash, set: updateData })
      .returning();
    return row;
  }

  async incrementUsage(id: string): Promise<void> {
    const updateData = { usageCount: sql`${videoCache.usageCount} + 1`, lastUsedAt: new Date() };
    await db
      .update(videoCache)
      .set(updateData as any)
      .where(eq(videoCache.id, id));
  }

  async deleteByHash(cacheHash: string): Promise<boolean> {
    const [row] = await db.delete(videoCache).where(eq(videoCache.cacheHash, cacheHash)).returning({ id: videoCache.id });
    return !!row;
  }

  async cleanupExpired(): Promise<number> {
    const deleted = await db
      .delete(videoCache)
      .where(and(sql`${videoCache.expiresAt} IS NOT NULL`, lt(videoCache.expiresAt, new Date())))
      .returning({ id: videoCache.id });
    return deleted.length;
  }

  async getStats(): Promise<{ totalEntries: number; totalHits: number; hitRate: number }> {
    const [row] = await db
      .select({
        totalEntries: sql<number>`count(*)::int`,
        totalHits: sql<number>`coalesce(sum(${videoCache.usageCount}), 0)::int`,
      })
      .from(videoCache);

    const totalEntries = row?.totalEntries ?? 0;
    const totalHits = row?.totalHits ?? 0;
    return {
      totalEntries,
      totalHits,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0,
    };
  }
}

export const videoCacheRepository = new VideoCacheRepository();