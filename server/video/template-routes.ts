import { Express } from "express";
import { templatesLoader, VideoTemplate } from "./templates-loader.ts";
import { logger } from "../core/observability/logger.ts";

/**
 * Initialize video template API routes.
 * These routes provide access to the template library loaded from disk.
 *
 * Routes:
 * - GET /api/video/templates - Get all templates (paginated and filtered)
 * - GET /api/video/templates/categories - Get all available categories
 * - GET /api/video/templates/:id - Get specific template by ID
 */
export async function initializeTemplateRoutes(app: Express): Promise<void> {
  // Ensure templates are loaded before routes are registered
  try {
    await templatesLoader.loadTemplates();
    const count = templatesLoader.getTemplateCount();
    const categories = templatesLoader.getCategoryCount();
    logger.info(
      { templateCount: count, categoryCount: categories },
      "Template loader initialized successfully"
    );
  } catch (err: any) {
    logger.error({ err }, "Failed to initialize template loader");
    throw err;
  }

  /**
   * GET /api/video/templates
   * Returns all templates with optional filtering and pagination
   *
   * Query parameters:
   * - category: Filter by category (e.g., "Product Showcase")
   * - industry: Filter by industry (e.g., "Luxury Jewelry")
   * - provider: Filter by compatible provider
   * - search: Search templates by title, description, or tags
   * - page: Page number (default: 1)
   * - limit: Results per page (default: 20, max: 100)
   *
   * Response:
   * {
   *   templates: VideoTemplate[],
   *   total: number,
   *   page: number,
   *   limit: number,
   *   hasMore: boolean
   * }
   */
  app.get("/api/video/templates", (_req, res) => {
    try {
      const category = _req.query.category as string | undefined;
      const industry = _req.query.industry as string | undefined;
      const provider = _req.query.provider as string | undefined;
      const search = (_req.query.search as string | undefined)?.toLowerCase();
      const page = Math.max(1, parseInt(_req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(_req.query.limit as string) || 20));

      let templates = templatesLoader.getAllTemplates();

      // Apply filters
      if (category) {
        templates = templates.filter((t) => t.category === category);
      }
      if (industry) {
        templates = templates.filter((t) => t.industry === industry);
      }
      if (provider) {
        templates = templates.filter((t) => t.providers.includes(provider as any));
      }
      if (search) {
        templates = templates.filter(
          (t) =>
            t.title.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            t.tags.some((tag) => tag.toLowerCase().includes(search))
        );
      }

      // Pagination
      const total = templates.length;
      const startIdx = (page - 1) * limit;
      const paginatedTemplates = templates.slice(startIdx, startIdx + limit);
      const hasMore = startIdx + limit < total;

      return res.json({
        templates: paginatedTemplates,
        total,
        page,
        limit,
        hasMore,
      });
    } catch (err: any) {
      logger.error({ err }, "Failed to fetch templates");
      return res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  /**
   * GET /api/video/templates/categories
   * Returns all available template categories and their metadata
   *
   * Response:
   * {
   *   categories: {
   *     [categoryName]: {
   *       name: string,
   *       count: number,
   *       industries: string[]
   *     }
   *   },
   *   industries: string[],
   *   total: number
   * }
   */
  app.get("/api/video/templates/categories", (_req, res) => {
    try {
      const templates = templatesLoader.getAllTemplates();
      const categories: Record<string, { name: string; count: number; industries: Set<string> }> = {};
      const industries = new Set<string>();

      for (const template of templates) {
        if (!categories[template.category]) {
          categories[template.category] = {
            name: template.category,
            count: 0,
            industries: new Set(),
          };
        }
        categories[template.category].count++;
        categories[template.category].industries.add(template.industry);
        industries.add(template.industry);
      }

      // Convert Sets to arrays for JSON serialization
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(categories)) {
        result[key] = {
          name: value.name,
          count: value.count,
          industries: Array.from(value.industries).sort(),
        };
      }

      return res.json({
        categories: result,
        industries: Array.from(industries).sort(),
        total: Object.keys(result).length,
      });
    } catch (err: any) {
      logger.error({ err }, "Failed to fetch template categories");
      return res.status(500).json({ error: "Failed to fetch template categories" });
    }
  });

  /**
   * GET /api/video/templates/:id
   * Returns a specific template by ID with full details
   *
   * Response: VideoTemplate or 404 if not found
   */
  app.get("/api/video/templates/:id", (_req, res) => {
    try {
      const template = templatesLoader.getTemplate(_req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      return res.json(template);
    } catch (err: any) {
      logger.error({ err, templateId: _req.params.id }, "Failed to fetch template");
      return res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  logger.info("Template API routes initialized successfully");
}
