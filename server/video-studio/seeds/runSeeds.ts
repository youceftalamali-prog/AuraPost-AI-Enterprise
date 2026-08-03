import { seedVideoTemplates } from './videoTemplatesSeed.js';
import { seedPromptBlocks } from './promptBlocksSeed.js';
import { seedProviders } from './providersSeed.js';
import { initVideoStudioDb } from '../db/index.js';
import { createVideoLogger } from '../utils/videoLogger.js';
import { DatabaseManager } from '../../db.js';

const logger = createVideoLogger('RunSeeds');

/**
 * One-off CLI script (run via `tsx server/video-studio/seeds/runSeeds.ts`).
 * Boots AuraPost's DatabaseManager exactly like the main server does, wires
 * the Video Studio's Drizzle layer to that same pool, then runs all seeds.
 * Idempotent — safe to run multiple times (uses ON CONFLICT DO NOTHING/UPDATE).
 */
async function runSeeds(): Promise<void> {
  logger.info('Starting seeds...');
  try {
    const dbManager = await DatabaseManager.getInstance();
    initVideoStudioDb(dbManager.getPool());

    const templates = await seedVideoTemplates();
    const blocks = await seedPromptBlocks();
    const providers = await seedProviders();

    logger.info('All seeds completed', { templates, blocks, providers });
    console.log(`Seeds complete — templates: ${templates}, blocks: ${blocks}, providers: ${providers}`);
    process.exit(0);
  } catch (error) {
    logger.error('Seed run failed', error as Error);
    console.error('Seed run failed:', error);
    process.exit(1);
  }
}

void runSeeds();