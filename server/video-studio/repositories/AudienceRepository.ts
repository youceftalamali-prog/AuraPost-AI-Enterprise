import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { audienceProfiles } from '../db/schema/brand.js';
import type { AudienceProfileRecord, NewAudienceProfileRecord } from '../types/entities.js';

export class AudienceRepository {
  async findById(id: string): Promise<AudienceProfileRecord | null> {
    const [row] = await db.select().from(audienceProfiles).where(eq(audienceProfiles.id, id)).limit(1);
    return row ?? null;
  }

  async findByWorkspace(workspaceId: string): Promise<AudienceProfileRecord[]> {
    return db
      .select()
      .from(audienceProfiles)
      .where(eq(audienceProfiles.workspaceId, workspaceId))
      .orderBy(desc(audienceProfiles.updatedAt));
  }

  async create(data: NewAudienceProfileRecord): Promise<AudienceProfileRecord> {
    const [row] = await db.insert(audienceProfiles).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewAudienceProfileRecord>): Promise<AudienceProfileRecord | null> {
    const updateData = { ...data, updatedAt: new Date() };
    const [row] = await db
      .update(audienceProfiles)
      .set(updateData as any)
      .where(eq(audienceProfiles.id, id))
      .returning();
    return row ?? null;
  }

  async saveAnalysis(id: string, analysis: Record<string, unknown>): Promise<AudienceProfileRecord | null> {
    const updateData = { analysis, updatedAt: new Date() };
    const [row] = await db
      .update(audienceProfiles)
      .set(updateData as any)
      .where(eq(audienceProfiles.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db.delete(audienceProfiles).where(eq(audienceProfiles.id, id)).returning({ id: audienceProfiles.id });
    return !!row;
  }
}

export const audienceRepository = new AudienceRepository();