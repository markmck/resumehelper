/**
 * Shared types and utilities for analysis bullet overrides.
 * Importable by both main process and renderer.
 */

export interface BulletOverride {
  bulletId: number
  overrideText: string
  source: 'ai_suggestion' | 'manual_edit'
  suggestionId: string | null
}

export interface SkillAddition {
  id: number
  analysisId: number
  skillName: string
  reason: string
  category: string
  status: 'pending' | 'accepted' | 'dismissed'
}

/**
 * Merges override text into a bullet list without mutating the input.
 * For each bullet, if an override exists for that bullet ID, the override
 * text replaces the base text in the returned array.
 */
export function applyOverrides(
  bullets: ReadonlyArray<{ id: number; text: string }>,
  overrides: ReadonlyArray<BulletOverride>
): Array<{ id: number; text: string }> {
  const overrideMap = new Map(overrides.map(o => [o.bulletId, o.overrideText]))
  return bullets.map(b => ({
    ...b,
    text: overrideMap.get(b.id) ?? b.text,
  }))
}
