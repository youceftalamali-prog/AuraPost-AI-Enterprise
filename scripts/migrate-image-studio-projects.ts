#!/usr/bin/env node
/**
 * IMAGE STUDIO MERGE — LEGACY PROJECT DATA MIGRATION
 *
 * The pre-merge app persisted "Image Studio" projects in a single flat
 * table (`image_studio_projects`: one row per project, a `layers` JSON
 * blob, no pages/versions/sharing). The merged app replaces this with the
 * richer `projects` + `project_pages` schema shared with every other
 * project type (design/template/brand/social/print/video).
 *
 * This script performs the one-time backfill:
 *   1. Reads every row currently in `image_studio_projects` (no-op if the
 *      table doesn't exist — safe to run on a fresh database).
 *   2. Creates one `projects` row per legacy project (type='design').
 *   3. Creates one `project_pages` row per legacy project, carrying over
 *      the existing `layers` JSON as-is (page 1 of 1) so no layer/canvas
 *      data is lost.
 *   4. Leaves the legacy table in place (does NOT drop it) — re-run this
 *      script safely any number of times; it's idempotent via
 *      `ON CONFLICT (id) DO NOTHING` keyed on a deterministic derived id.
 *
 * Dropping `image_studio_projects` is a separate, explicit, destructive
 * step — see `--drop-legacy-table` below — and should only be run after
 * verifying the new rows in the Projects UI.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-image-studio-projects.ts
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-image-studio-projects.ts --drop-legacy-table
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";

async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) AS exists`,
    [tableName]
  );
  return rows[0]?.exists === true;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const dropLegacy = process.argv.includes("--drop-legacy-table");
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    if (!(await tableExists(pool, "image_studio_projects"))) {
      console.log("No image_studio_projects table found — nothing to migrate.");
      return;
    }
    if (!(await tableExists(pool, "projects")) || !(await tableExists(pool, "project_pages"))) {
      console.error(
        "Target tables `projects`/`project_pages` don't exist yet. Start the app once " +
          "(it applies server/db/postgres/schemaSql.ts on boot) or run the SQL in " +
          "server/projects/db/011_projects.sql, then re-run this script."
      );
      process.exit(1);
    }

    const { rows: legacyProjects } = await pool.query(`SELECT * FROM image_studio_projects`);
    console.log(`Found ${legacyProjects.length} legacy image_studio_projects row(s).`);

    let migrated = 0;
    let skipped = 0;
    for (const legacy of legacyProjects) {
      // Deterministic id derived from the legacy row so re-runs are no-ops
      // instead of creating duplicate projects each time.
      const newProjectId = `migrated_${legacy.id}`;
      const client = await pool.connect();
      try {
        // `projects.user_id` is NOT NULL, but the legacy table never captured
        // a per-project owner — only a workspace_id. Resolve the workspace's
        // owner (fallback: any member) as the attributed user.
        const { rows: ownerRows } = await client.query(
          `SELECT user_id FROM workspace_members WHERE workspace_id = $1
           ORDER BY (role = 'owner') DESC, created_at ASC LIMIT 1`,
          [legacy.workspace_id]
        );
        if (ownerRows.length === 0) {
          console.warn(
            `Skipping legacy project ${legacy.id}: workspace ${legacy.workspace_id} has no members ` +
              `to attribute as user_id (required, NOT NULL). Resolve manually if needed.`
          );
          skipped++;
          continue;
        }
        const ownerId = ownerRows[0].user_id;

        await client.query("BEGIN");

        await client.query(
          `INSERT INTO projects (
             id, workspace_id, user_id, name, slug, type, status, visibility,
             canvas_width, canvas_height, metadata, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,'design','active','workspace',$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [
            newProjectId,
            legacy.workspace_id,
            ownerId,
            legacy.name,
            `${(legacy.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${newProjectId.slice(-8)}`,
            legacy.canvas_width,
            legacy.canvas_height,
            JSON.stringify({ migratedFrom: "image_studio_projects", legacyId: legacy.id, aspectRatio: legacy.aspect_ratio }),
            legacy.created_at,
            legacy.updated_at,
          ]
        );

        await client.query(
          `INSERT INTO project_pages (id, project_id, name, page_index, layers_snapshot, width, height, created_at, updated_at)
           VALUES ($1,$2,'Page 1',0,$3,$4,$5,$6,$7)
           ON CONFLICT (project_id, page_index) DO NOTHING`,
          [
            randomUUID(),
            newProjectId,
            legacy.layers,
            legacy.canvas_width,
            legacy.canvas_height,
            legacy.created_at,
            legacy.updated_at,
          ]
        );

        await client.query("COMMIT");
        migrated++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Failed to migrate legacy project ${legacy.id}:`, err);
      } finally {
        client.release();
      }
    }
    if (skipped > 0) {
      console.warn(`${skipped} legacy project(s) skipped — see warnings above.`);
    }

    console.log(`Migrated ${migrated}/${legacyProjects.length} legacy project(s) into projects/project_pages.`);

    if (dropLegacy) {
      console.log("Dropping legacy image_studio_projects table (--drop-legacy-table was passed)...");
      await pool.query(`DROP TABLE IF EXISTS image_studio_projects`);
      console.log("Dropped.");
    } else {
      console.log(
        "Legacy table left in place. Re-run with --drop-legacy-table once you've verified " +
          "the migrated projects in the app."
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
