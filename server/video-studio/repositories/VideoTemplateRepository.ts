import { eq, and, desc, asc, sql, inArray, like, or, type AnyColumn } from 'drizzle-orm';
import { db } from '../db/index.js';
import { videoTemplates, favoriteTemplates } from '../db/schema/videoTemplates.js';
import type {
  VideoTemplate,
  NewVideoTemplate,
  FavoriteTemplate,
} from '../types/entities.js';

export interface TemplateFilter {
  category?: string;
  subcategory?: string;
  style?: string;
  platform?: string;
  difficulty?: string;
  search?: string;
  minPopularity?: number;
  maxCost?: number;
  activeOnly?: boolean;
}

export type TemplateSortField = 'popularity' | 'estimatedCost' | 'estimatedDuration' | 'name' | 'createdAt';

export interface TemplateQuery {
  filter?: TemplateFilter;
  sortBy?: TemplateSortField;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

const SORT_COLUMNS: Record<TemplateSortField, AnyColumn> = {
  popularity: videoTemplates.popularity,
  estimatedCost: videoTemplates.estimatedCost,
  estimatedDuration: videoTemplates.estimatedDuration,
  name: videoTemplates.name,
  createdAt: videoTemplates.createdAt,
};

export class VideoTemplateRepository {
  async findById(id: string): Promise<VideoTemplate | null> {
    const [row] = await db.select().from(videoTemplates).where(eq(videoTemplates.id, id)).limit(1);
    return row ?? null;
  }

  async findByIds(ids: string[]): Promise<VideoTemplate[]> {
    if (ids.length === 0) return [];
    return db.select().from(videoTemplates).where(inArray(videoTemplates.id, ids));
  }

  async findAll(activeOnly = true): Promise<VideoTemplate[]> {
    return db
      .select()
      .from(videoTemplates)
      .where(activeOnly ? eq(videoTemplates.isActive, true) : undefined)
      .orderBy(desc(videoTemplates.popularity));
  }

  async query(params: TemplateQuery): Promise<{ items: VideoTemplate[]; total: number }> {
    const filter = params.filter ?? {};
    const conditions = [];

    if (filter.activeOnly !== false) conditions.push(eq(videoTemplates.isActive, true));
    if (filter.category) conditions.push(eq(videoTemplates.category, filter.category));
    if (filter.subcategory) conditions.push(eq(videoTemplates.subcategory, filter.subcategory));
    if (filter.style) conditions.push(eq(videoTemplates.style, filter.style));
    if (filter.platform) conditions.push(eq(videoTemplates.platform, filter.platform));
    if (filter.difficulty) conditions.push(eq(videoTemplates.difficulty, filter.difficulty));
    if (filter.minPopularity !== undefined) {
      conditions.push(sql`${videoTemplates.popularity} >= ${filter.minPopularity}`);
    }
    if (filter.maxCost !== undefined) {
      conditions.push(sql`${videoTemplates.estimatedCost}::numeric <= ${filter.maxCost}`);
    }
    if (filter.search) {
      const term = `%${filter.search}%`;
      conditions.push(
        or(
          like(videoTemplates.name, term),
          like(videoTemplates.description, term),
          like(videoTemplates.category, term),
          like(videoTemplates.style, term)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(videoTemplates)
      .where(where);

    const sortColumn = SORT_COLUMNS[params.sortBy ?? 'popularity'];
    const order = params.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const items = await db
      .select()
      .from(videoTemplates)
      .where(where)
      .orderBy(order)
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0);

    return { items, total: countRow?.count ?? 0 };
  }

  async findByCategory(category: string, activeOnly = true): Promise<VideoTemplate[]> {
    return db
      .select()
      .from(videoTemplates)
      .where(and(eq(videoTemplates.category, category), activeOnly ? eq(videoTemplates.isActive, true) : undefined))
      .orderBy(desc(videoTemplates.popularity));
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    return db
      .select({ category: videoTemplates.category, count: sql<number>`count(*)::int` })
      .from(videoTemplates)
      .where(eq(videoTemplates.isActive, true))
      .groupBy(videoTemplates.category)
      .orderBy(desc(sql`count(*)`));
  }

  async create(data: NewVideoTemplate): Promise<VideoTemplate> {
    const [row] = await db.insert(videoTemplates).values(data).returning();
    return row;
  }

  async createMany(rows: NewVideoTemplate[]): Promise<number> {
    if (rows.length === 0) return 0;
    const inserted = await db.insert(videoTemplates).values(rows).returning({ id: videoTemplates.id });
    return inserted.length;
  }

  async update(id: string, data: Partial<NewVideoTemplate>): Promise<VideoTemplate | null> {
    const updateData = { ...data, updatedAt: new Date() };
    const [row] = await db
      .update(videoTemplates)
      .set(updateData as any)
      .where(eq(videoTemplates.id, id))
      .returning();
    return row ?? null;
  }

  async incrementPopularity(id: string): Promise<void> {
    const updateData = { popularity: sql`${videoTemplates.popularity} + 1` };
    await db
      .update(videoTemplates)
      .set(updateData as any)
      .where(eq(videoTemplates.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const [row] = await db.delete(videoTemplates).where(eq(videoTemplates.id, id)).returning({ id: videoTemplates.id });
    return !!row;
  }

  // ---------- Favorites ----------
  async getUserFavorites(userId: string): Promise<VideoTemplate[]> {
    const rows = await db
      .select({ template: videoTemplates })
      .from(favoriteTemplates)
      .innerJoin(videoTemplates, eq(favoriteTemplates.templateId, videoTemplates.id))
      .where(eq(favoriteTemplates.userId, userId))
      .orderBy(desc(favoriteTemplates.createdAt));
    return rows.map((r) => r.template);
  }

  async isFavorite(userId: string, templateId: string): Promise<boolean> {
    const [row] = await db
      .select()
      .from(favoriteTemplates)
      .where(and(eq(favoriteTemplates.userId, userId), eq(favoriteTemplates.templateId, templateId)))
      .limit(1);
    return !!row;
  }

  async addFavorite(userId: string, templateId: string): Promise<FavoriteTemplate> {
    const [row] = await db
      .insert(favoriteTemplates)
      .values({ userId, templateId })
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async removeFavorite(userId: string, templateId: string): Promise<boolean> {
    const [row] = await db
      .delete(favoriteTemplates)
      .where(and(eq(favoriteTemplates.userId, userId), eq(favoriteTemplates.templateId, templateId)))
      .returning({ id: favoriteTemplates.id });
    return !!row;
  }
}

export const videoTemplateRepository = new VideoTemplateRepository();