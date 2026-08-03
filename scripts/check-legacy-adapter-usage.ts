#!/usr/bin/env node
/**
 * Reports on legacy adapter usage telemetry (see
 * server/core/telemetry/legacyAdapterTelemetry.ts), so a deprecated adapter
 * is only ever removed once telemetry actually confirms zero real-world use.
 *
 * Policy: do not delete any @deprecated adapter/method until this script
 * reports ZERO calls for that adapter across one full release cycle
 * (default window: 30 days — adjust with --days).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/check-legacy-adapter-usage.ts
 *   DATABASE_URL=postgres://... npx tsx scripts/check-legacy-adapter-usage.ts --days 14
 */

import { Pool } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const daysArgIndex = process.argv.indexOf("--days");
  const windowDays = daysArgIndex !== -1 ? Number(process.argv[daysArgIndex + 1]) : 30;

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { rows: tableCheck } = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'legacy_adapter_usage') AS exists`
    );
    if (!tableCheck[0]?.exists) {
      console.log("legacy_adapter_usage table doesn't exist yet — app hasn't booted against the new schema.");
      return;
    }

    const { rows } = await pool.query(
      `SELECT
         adapter_name,
         endpoint,
         COUNT(*) AS call_count,
         COUNT(*) FILTER (WHERE success = false) AS failure_count,
         MAX(called_at) AS last_called_at,
         MIN(called_at) AS first_called_at
       FROM legacy_adapter_usage
       WHERE called_at > NOW() - ($1 || ' days')::interval
       GROUP BY adapter_name, endpoint
       ORDER BY last_called_at DESC`,
      [windowDays]
    );

    console.log(`\nLegacy adapter usage in the last ${windowDays} day(s):\n`);

    if (rows.length === 0) {
      console.log(
        `✅ ZERO calls recorded for any legacy adapter in this window.\n` +
          `If this holds for a full release cycle, deprecated code (see AUDIT_REPORT.md, ` +
          `DEPENDENCY_REPORT_image_studio_projects.md) is safe to remove.`
      );
      return;
    }

    for (const row of rows) {
      console.log(
        `⚠️  ${row.adapter_name} :: ${row.endpoint}\n` +
          `    calls=${row.call_count}  failures=${row.failure_count}  ` +
          `first=${row.first_called_at.toISOString()}  last=${row.last_called_at.toISOString()}\n`
      );
    }

    console.log(
      `${rows.length} legacy adapter endpoint(s) still in active use — do NOT remove yet. ` +
        `Re-run this script after identifying and migrating the remaining caller(s).`
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
