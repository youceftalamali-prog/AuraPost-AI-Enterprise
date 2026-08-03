import { eq, and, desc, sql, inArray, like, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { promptBlocks } from '../db/schema/promptBlocks.js';
import type { PromptBlock, NewPromptBlock } from '../types/entities.js';
import type { PromptBlockCategory } from '../types/prompt.js';

export class PromptBlockRepository {
  async findById(id: string): Promise<PromptBlock | null> {
    const [row] = await db.select().from(promptBlocks).where(eq(promptBlocks.id, id)).limit(1);
    return row ?? null;
  }

  async findByIds(ids: string[]): Promise<PromptBlock[]> {
    if (ids.length === 0) return [];
    return db.select().from(promptBlocks).where(inArray(promptBlocks.id, ids));
  }

  async findAll(activeOnly = true): Promise<PromptBlock[]> {
    return db
      .select()
      .from(promptBlocks)
      .where(activeOnly ? eq(promptBlocks.isActive, true) : undefined)
      .orderBy(desc(promptBlocks.popularity));
  }

  async findByCategory(category: PromptBlockCategory, activeOnly = true): Promise<PromptBlock[]> {
    return db
      .select()
      .from(promptBlocks)
      .where(and(eq(promptBlocks.category, category), activeOnly ? eq(promptBlocks.isActive, true) : undefined))
      .orderBy(desc(promptBlocks.popularity));
  }

  async search(term: string, activeOnly = true): Promise<PromptBlock[]> {
    const likeTerm = `%${term}%`;
    return db
      .select()
      .from(promptBlocks)
      .where(
        and(
          activeOnly ? eq(promptBlocks.isActive, true) : undefined,
          or(like(promptBlocks.name, likeTerm), like(promptBlocks.description, likeTerm))
        )
      )
      .orderBy(desc(promptBlocks.popularity));
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    return db
      .select({ category: promptBlocks.category, count: sql<number>`count(*)::int` })
      .from(promptBlocks)
      .where(eq(promptBlocks.isActive, true))
      .groupBy(promptBlocks.category)
      .orderBy(desc(sql`count(*)`));
  }

  async create(data: NewPromptBlock): Promise<PromptBlock> {
    const [row] = await db.insert(promptBlocks).values(data).returning();
    return row;
  }

  async createMany(rows: NewPromptBlock[]): Promise<number> {
    if (rows.length === 0) return 0;
    const inserted = await db.insert(promptBlocks).values(rows).returning({ id: promptBlocks.id });
    return inserted.length;
  }

  async incrementPopularity(id: string): Promise<void> {
    const updateData = { popularity: sql`${promptBlocks.popularity} + 1` };
    await db
      .update(promptBlocks)
      .set(updateData as any)
      .where(eq(promptBlocks.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db.delete(promptBlocks).where(eq(promptBlocks.id, id)).returning({ id: promptBlocks.id });
    return !!row;
  }
}

export const promptBlockRepository = new PromptBlockRepository();