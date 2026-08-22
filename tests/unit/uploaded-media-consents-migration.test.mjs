import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { auraMigrations } from '../../server/database/auraMigrations.ts'

const migration = auraMigrations.find((m) => m.id === '015_uploaded_media_consents')

test('media consents migration is registered with valid id and recomputed checksum', () => {
	assert.ok(migration, 'expected 015_uploaded_media_consents migration to be registered')
	assert.match(migration.id, /^\d{3}_[a-z0-9_]+$/)
	assert.match(migration.checksum, /^[a-f0-9]{64}$/)
	assert.equal(migration.checksum, crypto.createHash('sha256').update(migration.sql).digest('hex'))
})

test('migration creates aura_uploaded_media_consents with consent columns', () => {
	const sql = migration.sql
	assert.match(sql, /CREATE TABLE IF NOT EXISTS aura_uploaded_media_consents\b/)
	for (const col of ['media_key', 'media_type', 'subject_name', 'consent_type', 'consent_status', 'consent_document_key', 'consent_locale', 'granted_at', 'revoked_at', 'expires_at']) {
		assert.match(sql, new RegExp(`\\b${col}\\b`))
	}
	assert.match(sql, /workspace_id TEXT NOT NULL[^,]*REFERENCES workspaces\(id\)/)
	assert.match(sql, /user_id TEXT NOT NULL[^,]*REFERENCES users\(id\)/)
})

test('migration defines lookup and unique media indexes', () => {
	const sql = migration.sql
	assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_aura_media_consent_media/)
	assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_aura_media_consent_lookup/)
})

test('migration is appended after the video templates migration', () => {
	const ids = auraMigrations.map((m) => m.id)
	assert.ok(ids.indexOf('015_uploaded_media_consents') > ids.indexOf('014_aura_video_templates'))
	assert.equal(new Set(ids).size, ids.length)
})
