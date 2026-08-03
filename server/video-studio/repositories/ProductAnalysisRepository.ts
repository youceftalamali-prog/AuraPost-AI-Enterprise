import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { productVideoAnalysis } from '../db/schema/productAnalysis.js';
import type {
  ProductVideoAnalysisRecord,
  NewProductVideoAnalysisRecord,
} from '../types/entities.js';

export class ProductAnalysisRepository {
  async findByProductAndWorkspace(
    productId: string,
    workspaceId: string
  ): Promise<ProductVideoAnalysisRecord | null> {
    const [row] = await db
      .select()
      .from(productVideoAnalysis)
      .where(
        and(
          eq(productVideoAnalysis.productId, productId),
          eq(productVideoAnalysis.workspaceId, workspaceId)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async upsert(
    productId: string,
    workspaceId: string,
    data: Omit<NewProductVideoAnalysisRecord, 'productId' | 'workspaceId'>
  ): Promise<ProductVideoAnalysisRecord> {
    const existing = await this.findByProductAndWorkspace(productId, workspaceId);

    if (existing) {
      const updateData = { ...data, analyzedAt: new Date() };
      const [row] = await db
        .update(productVideoAnalysis)
        .set(updateData as any)
        .where(eq(productVideoAnalysis.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await db
      .insert(productVideoAnalysis)
      .values({ productId, workspaceId, ...data })
      .returning();
    return row;
  }

  async delete(productId: string, workspaceId: string): Promise<boolean> {
    const [row] = await db
      .delete(productVideoAnalysis)
      .where(
        and(
          eq(productVideoAnalysis.productId, productId),
          eq(productVideoAnalysis.workspaceId, workspaceId)
        )
      )
      .returning({ id: productVideoAnalysis.id });
    return !!row;
  }
}

export const productAnalysisRepository = new ProductAnalysisRepository();