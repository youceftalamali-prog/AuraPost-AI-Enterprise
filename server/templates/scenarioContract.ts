// server/templates/scenarioContract.ts
// Shared contract for AuraPost video template "scenario_script" payloads.
// Pure, dependency-free logic so it is safe to run in CI and reuse across the
// templates UI, the multilingual avatar/TTS providers, and the FFmpeg
// two-person assembly engine. This defines exactly what is stored in the
// aura_video_templates.scenario_script JSONB column.

export type ScenarioAspectRatio = "9:16" | "1:1" | "16:9"

export type ScenarioAvatarProvider = "heygen" | "did"

export interface ScenarioActor {
	id: string
	role: string
	locale: string
	voiceId?: string
	avatarProvider?: ScenarioAvatarProvider
}

export interface ScenarioScene {
	id: string
	order: number
	durationSeconds: number
	script: string
	actorId?: string
	mediaSlot?: string
	transition?: string
}

export interface ScenarioScript {
	version: number
	locale: string
	aspectRatio: ScenarioAspectRatio
	isPromo: boolean
	actors: ScenarioActor[]
	scenes: ScenarioScene[]
	durationSeconds: number
}

export const SCENARIO_ASPECT_RATIOS: ScenarioAspectRatio[] = ["9:16", "1:1", "16:9"]
export const SCENARIO_AVATAR_PROVIDERS: ScenarioAvatarProvider[] = ["heygen", "did"]

export interface ScenarioValidationResult {
	valid: boolean
	errors: string[]
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value)
}

/**
 * Validate an untrusted scenario_script payload. Promo scenarios are
 * template-free and may omit actors/scenes; non-promo scenarios must define at
 * least one actor and one scene, with unique ids and valid references.
 */
export function validateScenarioScript(input: unknown): ScenarioValidationResult {
	const errors: string[] = []
	if (typeof input !== "object" || input === null) {
		return { valid: false, errors: ["scenario must be an object"] }
	}
	const s = input as Record<string, unknown>

	if (!isFiniteNumber(s.version) || (s.version as number) < 1) {
		errors.push("version must be a number >= 1")
	}
	if (!isNonEmptyString(s.locale)) {
		errors.push("locale is required")
	}
	if (!SCENARIO_ASPECT_RATIOS.includes(s.aspectRatio as ScenarioAspectRatio)) {
		errors.push("aspectRatio must be one of 9:16, 1:1, 16:9")
	}
	if (typeof s.isPromo !== "boolean") {
		errors.push("isPromo must be a boolean")
	}

	const isPromo = s.isPromo === true
	const actors = Array.isArray(s.actors) ? (s.actors as Record<string, unknown>[]) : null
	const scenes = Array.isArray(s.scenes) ? (s.scenes as Record<string, unknown>[]) : null

	const actorIds = new Set<string>()
	if (!isPromo && (!actors || actors.length === 0)) {
		errors.push("at least one actor is required")
	}
	if (actors) {
		actors.forEach((a, i) => {
			if (!isNonEmptyString(a.id)) errors.push(`actor[${i}].id is required`)
			else if (actorIds.has(a.id as string)) errors.push(`actor id "${a.id}" is duplicated`)
			else actorIds.add(a.id as string)
			if (!isNonEmptyString(a.role)) errors.push(`actor[${i}].role is required`)
			if (!isNonEmptyString(a.locale)) errors.push(`actor[${i}].locale is required`)
			if (
				a.avatarProvider !== undefined &&
				!SCENARIO_AVATAR_PROVIDERS.includes(a.avatarProvider as ScenarioAvatarProvider)
			) {
				errors.push(`actor[${i}].avatarProvider is invalid`)
			}
		})
	}

	const sceneIds = new Set<string>()
	if (!isPromo && (!scenes || scenes.length === 0)) {
		errors.push("at least one scene is required")
	}
	if (scenes) {
		scenes.forEach((sc, i) => {
			if (!isNonEmptyString(sc.id)) errors.push(`scene[${i}].id is required`)
			else if (sceneIds.has(sc.id as string)) errors.push(`scene id "${sc.id}" is duplicated`)
			else sceneIds.add(sc.id as string)
			if (!isFiniteNumber(sc.order)) errors.push(`scene[${i}].order must be a number`)
			if (!isFiniteNumber(sc.durationSeconds) || (sc.durationSeconds as number) <= 0) {
				errors.push(`scene[${i}].durationSeconds must be > 0`)
			}
			if (!isNonEmptyString(sc.script)) errors.push(`scene[${i}].script is required`)
			if (
				sc.actorId !== undefined &&
				sc.actorId !== null &&
				!actorIds.has(sc.actorId as string)
			) {
				errors.push(`scene[${i}].actorId "${sc.actorId}" does not reference a known actor`)
			}
		})
	}

	return { valid: errors.length === 0, errors }
}

export interface NormalizeOptions {
	defaultLocale?: string
	defaultAspectRatio?: ScenarioAspectRatio
}

/**
 * Coerce an untrusted payload into a well-formed ScenarioScript: fill defaults,
 * assign missing ids, sort scenes by order, renumber sequentially, and
 * recompute the total duration from scene durations.
 */
export function normalizeScenarioScript(
	input: unknown,
	options: NormalizeOptions = {},
): ScenarioScript {
	const defaultLocale = options.defaultLocale ?? "ar"
	const defaultAspectRatio = options.defaultAspectRatio ?? "9:16"
	const s = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>

	const version = isFiniteNumber(s.version) && (s.version as number) >= 1 ? Math.floor(s.version as number) : 1
	const locale = isNonEmptyString(s.locale) ? (s.locale as string).trim() : defaultLocale
	const aspectRatio = SCENARIO_ASPECT_RATIOS.includes(s.aspectRatio as ScenarioAspectRatio)
		? (s.aspectRatio as ScenarioAspectRatio)
		: defaultAspectRatio
	const isPromo = s.isPromo === true

	const rawActors = Array.isArray(s.actors) ? (s.actors as Record<string, unknown>[]) : []
	const actors: ScenarioActor[] = rawActors.map((a, i) => {
		const actor: ScenarioActor = {
			id: isNonEmptyString(a.id) ? (a.id as string) : `actor-${i + 1}`,
			role: isNonEmptyString(a.role) ? (a.role as string) : "presenter",
			locale: isNonEmptyString(a.locale) ? (a.locale as string) : locale,
		}
		if (isNonEmptyString(a.voiceId)) actor.voiceId = a.voiceId as string
		if (SCENARIO_AVATAR_PROVIDERS.includes(a.avatarProvider as ScenarioAvatarProvider)) {
			actor.avatarProvider = a.avatarProvider as ScenarioAvatarProvider
		}
		return actor
	})

	const rawScenes = Array.isArray(s.scenes) ? (s.scenes as Record<string, unknown>[]) : []
	const scenes: ScenarioScene[] = rawScenes
		.map((sc, i) => {
			const scene: ScenarioScene = {
				id: isNonEmptyString(sc.id) ? (sc.id as string) : `scene-${i + 1}`,
				order: isFiniteNumber(sc.order) ? (sc.order as number) : i + 1,
				durationSeconds:
					isFiniteNumber(sc.durationSeconds) && (sc.durationSeconds as number) > 0
						? (sc.durationSeconds as number)
						: 0,
				script: isNonEmptyString(sc.script) ? (sc.script as string) : "",
			}
			if (isNonEmptyString(sc.actorId)) scene.actorId = sc.actorId as string
			if (isNonEmptyString(sc.mediaSlot)) scene.mediaSlot = sc.mediaSlot as string
			if (isNonEmptyString(sc.transition)) scene.transition = sc.transition as string
			return scene
		})
		.sort((a, b) => a.order - b.order)
		.map((scene, i) => ({ ...scene, order: i + 1 }))

	const durationSeconds = scenes.reduce((sum, sc) => sum + (sc.durationSeconds > 0 ? sc.durationSeconds : 0), 0)

	return { version, locale, aspectRatio, isPromo, actors, scenes, durationSeconds }
}

/** A two-person scenario drives the FFmpeg dual-actor assembly path. */
export function isTwoPersonScenario(scenario: ScenarioScript): boolean {
	return scenario.actors.length === 2
}
