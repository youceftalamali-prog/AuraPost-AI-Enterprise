import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { auraMigrations } from '../../server/database/auraMigrations.ts'

const migration = auraMigrations.find((m) => m.id === '014_aura_video_templates')

test('video templates migration is registered with valid id and recomputed checksum', () => {
	assert.ok(migration, 'expected 014_aura_video_templates migration to be registered')
	assert.match(migration.id, /^\d{3}_[a-z0-9_]+$/)
	assert.match(migration.checksum, /^[a-f0-9]{64}$/)
	assert.equal(migration.checksum, crypto.createHash('sha256').update(migration.sql).digest('hex'))
})

test('migration creates aura_video_templates with scenario_script JSONB', () => {
	const sql = migration.sql
	assert.match(sql, /CREATE TABLE IF NOT EXISTS aura_video_templates\b/)
	assert.match(sql, /scenario_script JSONB/)
	for (const col of ['category', 'subcategory', 'locale', 'aspect_ratio', 'actor_count', 'duration_seconds', 'is_system', 'is_promo', 'preview_video_key', 'preview_poster_key', 'tags']) {
		assert.match(sql, new RegExp(`\\b${col}\\b`))
	}
	assert.match(sql, /workspace_id TEXT[^,]*REFERENCES workspaces\(id\)/)
	assert.match(sql, /created_by_user_id TEXT[^,]*REFERENCES users\(id\)/)
})

test('migration defines browse and unique slug indexes', () => {
	const sql = migration.sql
	assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_aura_video_template_browse/)
	assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_video_template_system_slug/)
	assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_video_template_workspace_slug/)
})

test('migration is appended after the existing aura migrations', () => {
	const ids = auraMigrations.map((m) => m.id)
	assert.ok(ids.indexOf('014_aura_video_templates') > ids.indexOf('013_aura_agent_conversations'))
	assert.equal(new Set(ids).size, ids.length)
})
