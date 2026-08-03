import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { campaignProfiles, campaignGenerations } from '../db/schema/brand.js';
import type {
  CampaignProfileRecord,
  NewCampaignProfileRecord,
  CampaignGenerationRecord,
  NewCampaignGenerationRecord,
} from '../types/entities.js';

export class CampaignRepository {
  // ---------- Profiles ----------
  async findById(id: string): Promise<CampaignProfileRecord | null> {
    const [row] = await db.select().from(campaignProfiles).where(eq(campaignProfiles.id, id)).limit(1);
    return row ?? null;
  }

  async findByWorkspace(workspaceId: string): Promise<CampaignProfileRecord[]> {
    return db
      .select()
      .from(campaignProfiles)
      .where(eq(campaignProfiles.workspaceId, workspaceId))
      .orderBy(desc(campaignProfiles.updatedAt));
  }

  async create(data: NewCampaignProfileRecord): Promise<CampaignProfileRecord> {
    const [row] = await db.insert(campaignProfiles).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewCampaignProfileRecord>): Promise<CampaignProfileRecord | null> {
    const updateData = { ...data, updatedAt: new Date() };
    const [row] = await db
      .update(campaignProfiles)
      .set(updateData)
      .where(eq(campaignProfiles.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db.delete(campaignProfiles).where(eq(campaignProfiles.id, id)).returning({ id: campaignProfiles.id });
    return !!row;
  }

  // ---------- Generations ----------
  async findGenerationsByCampaign(campaignId: string): Promise<CampaignGenerationRecord[]> {
    return db
      .select()
      .from(campaignGenerations)
      .where(eq(campaignGenerations.campaignId, campaignId))
      .orderBy(desc(campaignGenerations.createdAt));
  }

  async createGeneration(data: NewCampaignGenerationRecord): Promise<CampaignGenerationRecord> {
    const [row] = await db.insert(campaignGenerations).values(data).returning();
    return row;
  }

  async deleteGenerationsByCampaign(campaignId: string): Promise<number> {
    const deleted = await db
      .delete(campaignGenerations)
      .where(eq(campaignGenerations.campaignId, campaignId))
      .returning({ id: campaignGenerations.id });
    return deleted.length;
  }
}

export const campaignRepository = new CampaignRepository();