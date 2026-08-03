import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { brandProfiles } from '../db/schema/brand.js';
import type { BrandProfileRecord, NewBrandProfileRecord } from '../types/entities.js';

export class BrandRepository {
  async findById(id: string): Promise<BrandProfileRecord | null> {
    const [row] = await db.select().from(brandProfiles).where(eq(brandProfiles.id, id)).limit(1);
    return row ?? null;
  }

  async findByWorkspace(workspaceId: string): Promise<BrandProfileRecord[]> {
    return db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.workspaceId, workspaceId))
      .orderBy(desc(brandProfiles.updatedAt));
  }

  async create(data: NewBrandProfileRecord): Promise<BrandProfileRecord> {
    const [row] = await db.insert(brandProfiles).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewBrandProfileRecord>): Promise<BrandProfileRecord | null> {
    const updateData = { ...data, updatedAt: new Date() };
    const [row] = await db
      .update(brandProfiles)
      .set(updateData as any)
      .where(eq(brandProfiles.id, id))
      .returning();
    return row ?? null;
  }

  async saveAnalysis(id: string, analysis: Record<string, unknown>): Promise<BrandProfileRecord | null> {
    const updateData = { analysis, updatedAt: new Date() };
    const [row] = await db
      .update(brandProfiles)
      .set(updateData as any)
      .where(eq(brandProfiles.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db.delete(brandProfiles).where(eq(brandProfiles.id, id)).returning({ id: brandProfiles.id });
    return !!row;
  }
}

export const brandRepository = new BrandRepository();