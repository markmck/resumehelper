import { useEffect, useMemo, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Gap {
  skill: string
  severity: 'critical' | 'moderate'
  reason?: string
}

interface RewriteSuggestion {
  original_text: string
  suggested_text: string
  target_keywords: string[]
}

interface ScoreBreakdown {
  keyword_score: number
  skills_score: number
  experience_score: number
  ats_score: number
}

interface AnalysisData {
  id: number
  jobPostingId: number
  variantId: number
  variantName: string | null
  matchScore: number
  keywordHits: string[]
  keywordMisses: string[]
  semanticMatches: string[]
  gapSkills: Gap[]
  suggestions: RewriteSuggestion[]
  atsFlags: string[]
  scoreBreakdown: ScoreBreakdown | null
  status: string
  createdAt: Date
  company: string
  role: string
}

type SuggestionState = 'pending' | 'accepted' | 'dismissed'

interface SuggestionEdit {
  state: SuggestionState
  finalText: string
}

type StagedSkillState = 'pending' | 'added' | 'skipped'

interface StagedSkill {
  name: string
  reason: string
  severity: 'critical' | 'moderate'
  state: StagedSkillState
}

interface BuilderBullet {
  id: number
  text: string
  excluded?: boolean
}

interface OptimizeVariantProps {
  analysisId: number
  onBack: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--color-success)'
  if (score >= 50) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function deriveOverallScore(subscores: {
  keyword_score: number
  skills_score: number
  experience_score: number
  ats_score: number
}): number {
  const kw = Math.max(0, Math.min(100, subscores.keyword_score))
  const sk = Math.max(0, Math.min(100, subscores.skills_score))
  const ex = Math.max(0, Math.min(100, subscores.experience_score))
  const at = Math.max(0, Math.min(100, subscores.ats_score))
  return Math.round(kw * 0.35 + sk * 0.35 + ex * 0.2 + at * 0.1)
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Strong match'
  if (score >= 50) return 'Good match'
  return 'Needs work'
}

function pointImpact(kwCount: number): { label: string; color: string; bg: string } {
  if (kwCount >= 3) return { label: '+4 pts', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' }
  if (kwCount === 2) return { label: '+3 pts', color: 'var(--color-success)', bg: 'rgba(34,197,94,0.12)' }
  return { label: '+2 pts', color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.12)' }
}

// ─── Component ─────────────────────────────────────────────────────────────────

function OptimizeVariant({ analysisId, onBack }: OptimizeVariantProps): React.JSX.Element {
  // ── Data state
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [bulletIdMap, setBulletIdMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Suggestion state machine
  const [suggStates, setSuggStates] = useState<SuggestionEdit[]>([])
  const [stagedSkills, setStagedSkills] = useState<StagedSkill[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // ── Save flow state
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saveAsNew, setSaveAsNew] = useState(false)
  const [newVariantName, setNewVariantName] = useState('')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  // ── Load on mount
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const raw = await window.api.jobPostings.getAnalysis(analysisId)
        if (!raw || 'error' in raw) {
          setError('Failed to load analysis data.')
          setLoading(false)
          return
        }

        const data = raw as AnalysisData
        setAnalysis(data)

        // Initialize suggestion states
        const suggs = data.suggestions ?? []
        setSuggStates(suggs.map((s) => ({ state: 'pending', finalText: s.suggested_text })))

        // Load builder data for bullet ID map
        if (data.variantId != null) {
          const builderData = await window.api.templates.getBuilderData(data.variantId)
          if (builderData && !('error' in builderData)) {
            const map = new Map<string, number>()
            const bd = builderData as { jobs?: Array<{ bullets?: BuilderBullet[] }>; }
            if (Array.isArray(bd.jobs)) {
              for (const job of bd.jobs) {
                if (Array.isArray(job.bullets)) {
                  for (const b of job.bullets) {
                    if (!b.excluded) {
                      map.set(b.text, b.id)
                    }
                  }
                }
              }
            }
            setBulletIdMap(map)

            // Derive skill suggestions: gap skills not included in variant
            const gapSkills = data.gapSkills ?? []
            const bdAny = builderData as Record<string, unknown>
            const includedSkillNames = new Set<string>()
            const excludedSkillNames = new Set<string>()
            if (Array.isArray(bdAny.skills)) {
              for (const s of bdAny.skills as Array<{ name?: string; excluded?: boolean }>) {
                if (s.name) {
                  if (s.excluded) {
                    excludedSkillNames.add(s.name.toLowerCase())
                  } else {
                    includedSkillNames.add(s.name.toLowerCase())
                  }
                }
              }
            }
            const suggestions: StagedSkill[] = []
            for (const g of gapSkills) {
              const lower = g.skill.toLowerCase()
              if (includedSkillNames.has(lower)) continue // already included
              if (excludedSkillNames.has(lower)) {
                // Skill exists but is excluded from this variant — suggest re-including
                suggestions.push({
                  name: g.skill,
                  reason: 'Already in your skills but excluded from this variant. Re-include it.',
                  severity: g.severity,
                  state: 'pending',
                })
              } else {
                // Skill doesn't exist at all — suggest adding
                suggestions.push({
                  name: g.skill,
                  reason: g.reason ?? 'Required by posting. Not currently in variant.',
                  severity: g.severity,
                  state: 'pending',
                })
              }
            }
            setStagedSkills(suggestions)
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [analysisId])

  // ── Local score computation
  const computedScore = useMemo(() => {
    if (!analysis || !analysis.scoreBreakdown) return analysis?.matchScore ?? 0

    const suggs = analysis.suggestions ?? []
    const missingKeywords = analysis.keywordMisses ?? []
    const keywordHits = analysis.keywordHits ?? []
    const semanticMatches = analysis.semanticMatches ?? []

    // Count resolved keywords from accepted suggestions
    let resolvedCount = 0
    for (let i = 0; i < suggStates.length; i++) {
      if (suggStates[i].state === 'accepted' && suggs[i]) {
        for (const kw of suggs[i].target_keywords) {
          if (missingKeywords.some((mk) => mk.toLowerCase() === kw.toLowerCase())) {
            resolvedCount++
          }
        }
      }
    }
    const totalKeywords = keywordHits.length + semanticMatches.length + missingKeywords.length
    const newExact = keywordHits.length + resolvedCount
    const kwScore =
      totalKeywords > 0
        ? Math.round(((newExact + semanticMatches.length * 0.5) / totalKeywords) * 100)
        : analysis.scoreBreakdown.keyword_score

    // Skills score boost from added skills
    const addedSkillCount = stagedSkills.filter((s) => s.state === 'added').length
    const skScore = Math.min(100, analysis.scoreBreakdown.skills_score + addedSkillCount * 5)

    return deriveOverallScore({
      keyword_score: kwScore,
      skills_score: skScore,
      experience_score: analysis.scoreBreakdown.experience_score,
      ats_score: analysis.scoreBreakdown.ats_score,
    })
  }, [analysis, suggStates, stagedSkills])

  // ── Derived display values
  const originalScore = analysis?.matchScore ?? 0
  const scoreDelta = computedScore - originalScore

  const pendingCount = suggStates.filter((s) => s.state === 'pending').length
  const acceptedCount = suggStates.filter((s) => s.state === 'accepted').length
  const pendingSkillCount = stagedSkills.filter((s) => s.state === 'pending').length
  const addedSkillCount = stagedSkills.filter((s) => s.state === 'added').length

  // Sum of point impacts for remaining pending suggestions
  const ptsAvailable = useMemo(() => {
    if (!analysis) return 0
    const suggs = analysis.suggestions ?? []
    let total = 0
    for (let i = 0; i < suggStates.length; i++) {
      if (suggStates[i].state === 'pending' && suggs[i]) {
        const kwc = suggs[i].target_keywords.length
        total += kwc >= 3 ? 4 : kwc === 2 ? 3 : 2
      }
    }
    return total
  }, [analysis, suggStates])

  // Resolved missing keywords (accepted suggestions targeting them)
  const resolvedKeywords = useMemo(() => {
    if (!analysis) return new Set<string>()
    const suggs = analysis.suggestions ?? []
    const resolved = new Set<string>()
    for (let i = 0; i < suggStates.length; i++) {
      if (suggStates[i].state === 'accepted' && suggs[i]) {
        for (const kw of suggs[i].target_keywords) {
          resolved.add(kw.toLowerCase())
        }
      }
    }
    return resolved
  }, [analysis, suggStates])

  // Resolved gaps (added skills)
  const resolvedGapSkills = useMemo(() => {
    const resolved = new Set<string>()
    for (const sk of stagedSkills) {
      if (sk.state === 'added') resolved.add(sk.name.toLowerCase())
    }
    return resolved
  }, [stagedSkills])

  // ── Actions
  const accept = (i: number): void => {
    setSuggStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'accepted' } : s)))
    if (editingIndex === i) setEditingIndex(null)
  }

  const dismiss = (i: number): void => {
    setSuggStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'dismissed' } : s)))
    if (editingIndex === i) setEditingIndex(null)
  }

  const undo = (i: number): void => {
    const orig = analysis?.suggestions[i]?.suggested_text ?? ''
    setSuggStates((prev) =>
      prev.map((s, idx) => (idx === i ? { state: 'pending', finalText: orig } : s))
    )
  }

  const acceptAll = (): void => {
    setSuggStates((prev) =>
      prev.map((s) => (s.state === 'pending' ? { ...s, state: 'accepted' } : s))
    )
    setEditingIndex(null)
  }

  const editFirst = (i: number): void => {
    setEditingIndex(i)
  }

  const updateFinalText = (i: number, text: string): void => {
    setSuggStates((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, finalText: text } : s))
    )
  }

  const addSkill = (i: number): void => {
    setStagedSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'added' } : s)))
  }

  const skipSkill = (i: number): void => {
    setStagedSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'skipped' } : s)))
  }

  const undoSkill = (i: number): void => {
    setStagedSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, state: 'pending' } : s)))
  }

  // ── Save handler
  const handleSave = async (asNew: boolean): Promise<void> => {
    if (!analysis) return
    setSaving(true)
    setShowConfirm(false)
    try {
      let targetVariantId = analysis.variantId

      // 1. Duplicate variant if saving as new
      if (asNew) {
        const duplicated = await window.api.templates.duplicate(analysis.variantId)
        const dup = duplicated as { id?: number }
        if (dup?.id) {
          targetVariantId = dup.id
          // Rename the copy if user provided a name
          const trimmed = newVariantName.trim()
          if (trimmed) {
            await window.api.templates.rename(dup.id, trimmed)
          }
        }
      }

      // 2. Write accepted bullet rewrites (global — not per-variant)
      const suggs = analysis.suggestions ?? []
      for (let i = 0; i < suggStates.length; i++) {
        if (suggStates[i].state === 'accepted' && suggs[i]) {
          const bulletId = bulletIdMap.get(suggs[i].original_text)
          if (bulletId != null) {
            await window.api.bullets.update(bulletId, { text: suggStates[i].finalText })
          } else {
            console.warn(
              '[OptimizeVariant] No bullet ID found for original text:',
              suggs[i].original_text
            )
          }
        }
      }

      // 3. Create and link added skills
      for (const sk of stagedSkills) {
        if (sk.state === 'added') {
          const created = await window.api.skills.create({ name: sk.name, tags: [] })
          const createdSkill = created as { id?: number }
          if (createdSkill?.id != null) {
            await window.api.templates.setItemExcluded(
              targetVariantId,
              'skill',
              createdSkill.id,
              false
            )
          }
        }
      }

      // 4. Stamp analysis status to 'optimized'
      await window.api.jobPostings.updateAnalysisStatus(analysisId, 'optimized')

      setSavedMessage(asNew ? 'New optimized variant created successfully' : 'Variant optimized successfully')
    } catch (e) {
      console.error('[OptimizeVariant] Save error:', e)
      setSavedMessage('Save failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  // ── Loading / Error states
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-text-secondary)',
          gap: 'var(--space-3)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 18,
            height: 18,
            border: '2px solid var(--color-accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'ov-spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: 'var(--font-size-sm)' }}>Loading...</span>
        <style>{`@keyframes ov-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div style={{ padding: 'var(--space-8)', fontFamily: 'var(--font-sans)' }}>
        <p style={{ color: 'var(--color-danger)' }}>{error ?? 'No data returned.'}</p>
        <button
          onClick={onBack}
          style={{
            padding: '6px 14px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Back
        </button>
      </div>
    )
  }

  const suggs = analysis.suggestions ?? []
  const missingKeywords = analysis.keywordMisses ?? []
  const gapSkills = analysis.gapSkills ?? []
  const sb = analysis.scoreBreakdown

  // SVG ring
  const CIRCUMFERENCE = 314 // 2 * pi * 50
  const strokeOffset = CIRCUMFERENCE - (CIRCUMFERENCE * computedScore) / 100
  const ringColor = getScoreColor(computedScore)

  const canSave = acceptedCount > 0 || addedSkillCount > 0

  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-text-primary)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes ov-spin { to { transform: rotate(360deg); } }
        .ov-score-ring-progress {
          transition: stroke-dashoffset 0.6s ease;
        }
      `}</style>

      {/* ── Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-bg-surface)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          Results
        </button>
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          /
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          Optimize Variant
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {analysis.role} · {analysis.company}
          </span>
          {analysis.variantName && (
            <span
              style={{
                padding: '2px 8px',
                backgroundColor: 'rgba(139,92,246,0.12)',
                color: 'var(--color-accent)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
              }}
            >
              {analysis.variantName}
            </span>
          )}
        </div>
      </div>

      {/* ── Two-pane body */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          overflow: 'hidden',
        }}
      >
        {/* ─── LEFT PANE: Suggestion Cards */}
        <div
          style={{
            overflowY: 'auto',
            padding: 'var(--space-5) var(--space-6)',
            borderRight: '1px solid var(--color-border-subtle)',
          }}
        >
          {/* Left pane header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-5)',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Bullet Rewrites
            </h2>
            {pendingCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1px 8px',
                  backgroundColor: 'rgba(139,92,246,0.12)',
                  color: 'var(--color-accent)',
                  borderRadius: '999px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                }}
              >
                {pendingCount} remaining
              </span>
            )}
            {pendingCount > 0 && (
              <button
                onClick={acceptAll}
                style={{
                  marginLeft: 'auto',
                  padding: '5px 12px',
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  color: 'var(--color-success)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Accept all
              </button>
            )}
          </div>

          {/* Suggestion cards */}
          {suggs.length === 0 ? (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
              No rewrite suggestions were generated.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {suggs.map((s, i) => {
                const st = suggStates[i]
                if (!st) return null
                const isAccepted = st.state === 'accepted'
                const isDismissed = st.state === 'dismissed'
                const isEditing = editingIndex === i
                const impact = pointImpact(s.target_keywords.length)

                return (
                  <div
                    key={i}
                    style={{
                      backgroundColor: isAccepted
                        ? 'rgba(34,197,94,0.04)'
                        : 'var(--color-bg-surface)',
                      border: isAccepted
                        ? '1px solid rgba(34,197,94,0.25)'
                        : '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      opacity: isDismissed ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Card header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-3)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-tertiary)',
                          fontWeight: 500,
                        }}
                      >
                        {analysis.company} · Bullet {i + 1}
                      </span>
                      <span
                        style={{
                          padding: '1px 7px',
                          backgroundColor: impact.bg,
                          color: impact.color,
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 600,
                        }}
                      >
                        {impact.label}
                      </span>
                      {isAccepted && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            padding: '1px 8px',
                            backgroundColor: 'rgba(34,197,94,0.12)',
                            color: 'var(--color-success)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                          }}
                        >
                          Accepted
                        </span>
                      )}
                      {isDismissed && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            padding: '1px 8px',
                            backgroundColor: 'rgba(239,68,68,0.10)',
                            color: 'var(--color-danger)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                          }}
                        >
                          Dismissed
                        </span>
                      )}
                    </div>

                    {/* Original text */}
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-muted)',
                        textDecoration: 'line-through',
                        margin: '0 0 var(--space-2) 0',
                        lineHeight: 1.5,
                      }}
                    >
                      {s.original_text}
                    </p>

                    {/* Suggested text or textarea when editing */}
                    {isEditing ? (
                      <textarea
                        value={st.finalText}
                        onChange={(e) => updateFinalText(i, e.target.value)}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: 'var(--space-2) var(--space-3)',
                          backgroundColor: 'var(--color-bg-input)',
                          border: '1px solid var(--color-accent)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--color-text-primary)',
                          fontSize: 'var(--font-size-sm)',
                          fontFamily: 'var(--font-sans)',
                          lineHeight: 1.5,
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box',
                          marginBottom: 'var(--space-2)',
                        }}
                        autoFocus
                      />
                    ) : (
                      <div
                        style={{
                          borderLeft: '2px solid var(--color-accent)',
                          paddingLeft: 'var(--space-2)',
                          marginBottom: 'var(--space-2)',
                          backgroundColor: isAccepted ? 'rgba(34,197,94,0.08)' : undefined,
                          borderRadius: isAccepted ? '0 var(--radius-sm) var(--radius-sm) 0' : undefined,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-primary)',
                            margin: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {st.finalText}
                        </p>
                      </div>
                    )}

                    {/* Target keyword pills */}
                    {s.target_keywords.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 'var(--space-1)',
                          marginBottom: 'var(--space-3)',
                        }}
                      >
                        {s.target_keywords.map((kw) => (
                          <span
                            key={kw}
                            style={{
                              padding: '1px 6px',
                              backgroundColor: 'rgba(139,92,246,0.12)',
                              color: 'var(--color-accent-light)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--font-size-xs)',
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      {st.state === 'pending' && (
                        <>
                          <button
                            onClick={() => accept(i)}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: 'rgba(34,197,94,0.12)',
                              color: 'var(--color-success)',
                              border: '1px solid rgba(34,197,94,0.3)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => editFirst(i)}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-text-secondary)',
                              border: '1px solid var(--color-border-default)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--font-size-xs)',
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Edit first
                          </button>
                          <button
                            onClick={() => dismiss(i)}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-text-tertiary)',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--font-size-xs)',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      {isEditing && st.state === 'pending' && (
                        <button
                          onClick={() => accept(i)}
                          style={{
                            padding: '5px 12px',
                            backgroundColor: 'var(--color-accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          Confirm
                        </button>
                      )}
                      {(isAccepted || isDismissed) && (
                        <button
                          onClick={() => undo(i)}
                          style={{
                            padding: '5px 12px',
                            backgroundColor: 'transparent',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border-default)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-xs)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Skill Suggestions section */}
          {stagedSkills.length > 0 && (
            <div style={{ marginTop: 'var(--space-8)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <h2
                  style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  Add missing skills to variant
                </h2>
                {pendingSkillCount > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1px 8px',
                      backgroundColor: 'rgba(239,68,68,0.10)',
                      color: 'var(--color-danger)',
                      borderRadius: '999px',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 600,
                    }}
                  >
                    {pendingSkillCount} pending
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {stagedSkills.map((sk, i) => {
                  const isAdded = sk.state === 'added'
                  const isSkipped = sk.state === 'skipped'
                  return (
                    <div
                      key={i}
                      style={{
                        backgroundColor: isAdded
                          ? 'rgba(34,197,94,0.04)'
                          : 'var(--color-bg-surface)',
                        border: isAdded
                          ? '1px solid rgba(34,197,94,0.25)'
                          : '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-3) var(--space-4)',
                        opacity: isSkipped ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                              marginBottom: 'var(--space-1)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 700,
                                color: 'var(--color-text-primary)',
                              }}
                            >
                              {sk.name}
                            </span>
                            <span
                              style={{
                                padding: '1px 6px',
                                backgroundColor:
                                  sk.severity === 'critical'
                                    ? 'rgba(239,68,68,0.12)'
                                    : 'rgba(245,158,11,0.12)',
                                color:
                                  sk.severity === 'critical'
                                    ? 'var(--color-danger)'
                                    : 'var(--color-warning)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 500,
                              }}
                            >
                              {sk.severity === 'critical' ? 'Critical' : 'Moderate'}
                            </span>
                            {isAdded && (
                              <span
                                style={{
                                  padding: '1px 8px',
                                  backgroundColor: 'rgba(34,197,94,0.12)',
                                  color: 'var(--color-success)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: 600,
                                }}
                              >
                                Added
                              </span>
                            )}
                            {isSkipped && (
                              <span
                                style={{
                                  padding: '1px 8px',
                                  backgroundColor: 'rgba(239,68,68,0.10)',
                                  color: 'var(--color-danger)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: 600,
                                }}
                              >
                                Skipped
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              fontSize: 'var(--font-size-xs)',
                              color: 'var(--color-text-secondary)',
                              margin: 0,
                            }}
                          >
                            {sk.reason}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                          {sk.state === 'pending' && (
                            <>
                              <button
                                onClick={() => addSkill(i)}
                                style={{
                                  padding: '5px 12px',
                                  backgroundColor: 'var(--color-accent)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-sans)',
                                }}
                              >
                                Add skill
                              </button>
                              <button
                                onClick={() => skipSkill(i)}
                                style={{
                                  padding: '5px 12px',
                                  backgroundColor: 'transparent',
                                  color: 'var(--color-text-tertiary)',
                                  border: 'none',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: 'var(--font-size-xs)',
                                  cursor: 'pointer',
                                  fontFamily: 'var(--font-sans)',
                                }}
                              >
                                Skip
                              </button>
                            </>
                          )}
                          {(isAdded || isSkipped) && (
                            <button
                              onClick={() => undoSkill(i)}
                              style={{
                                padding: '5px 12px',
                                backgroundColor: 'transparent',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border-default)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-xs)',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                              }}
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT PANE: Live Score Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 'var(--space-5)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          {/* SVG Score Ring */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 'var(--space-5)',
            }}
          >
            <svg
              viewBox="0 0 120 120"
              width={120}
              height={120}
              style={{ display: 'block', marginBottom: 'var(--space-2)' }}
            >
              {/* Background track */}
              <circle
                cx={60}
                cy={60}
                r={50}
                fill="none"
                stroke="var(--color-bg-raised)"
                strokeWidth={8}
              />
              {/* Progress arc */}
              <circle
                cx={60}
                cy={60}
                r={50}
                fill="none"
                stroke={ringColor}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
              />
              {/* Score number */}
              <text
                x={60}
                y={64}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={ringColor}
                fontSize={26}
                fontWeight={700}
                fontFamily="var(--font-sans)"
              >
                {computedScore}
              </text>
            </svg>

            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-1) 0',
                textAlign: 'center',
              }}
            >
              {getScoreLabel(computedScore)}
            </p>
            {ptsAvailable > 0 && (
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                {ptsAvailable} pts available
              </p>
            )}

            {/* Score delta badge */}
            {scoreDelta > 0 && (
              <div
                style={{
                  marginTop: 'var(--space-2)',
                  padding: '3px 10px',
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  color: 'var(--color-success)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                }}
              >
                +{scoreDelta} points from accepted changes
              </div>
            )}
          </div>

          {/* Score breakdown rows */}
          {sb && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 var(--space-3) 0',
                }}
              >
                Score Breakdown
              </p>
              {[
                { label: 'Keywords', value: sb.keyword_score },
                { label: 'Experience', value: sb.experience_score },
                { label: 'Skills', value: sb.skills_score },
                { label: 'ATS Format', value: sb.ats_score },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{ marginBottom: 'var(--space-3)' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        color: getScoreColor(value),
                      }}
                    >
                      {value}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      backgroundColor: 'var(--color-bg-raised)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${value}%`,
                        backgroundColor: getScoreColor(value),
                        borderRadius: 'var(--radius-sm)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missing Keywords */}
          {missingKeywords.length > 0 && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 var(--space-2) 0',
                }}
              >
                Missing Keywords
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                {missingKeywords.map((kw) => {
                  const resolved = resolvedKeywords.has(kw.toLowerCase())
                  return (
                    <span
                      key={kw}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: resolved
                          ? 'rgba(34,197,94,0.12)'
                          : 'rgba(239,68,68,0.12)',
                        color: resolved ? 'var(--color-success)' : 'var(--color-danger)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 500,
                        textDecoration: resolved ? 'line-through' : 'none',
                        transition: 'background-color 0.3s ease, color 0.3s ease',
                      }}
                    >
                      {kw}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gap Skills */}
          {gapSkills.length > 0 && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 var(--space-2) 0',
                }}
              >
                Skill Gaps
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {gapSkills.map((g, i) => {
                  const isResolved = resolvedGapSkills.has(g.skill.toLowerCase())
                  const dotColor = isResolved
                    ? 'var(--color-success)'
                    : g.severity === 'critical'
                    ? 'var(--color-danger)'
                    : 'var(--color-warning)'
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: dotColor,
                          flexShrink: 0,
                          transition: 'background-color 0.3s ease',
                        }}
                      />
                      <span
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: isResolved ? 'var(--color-success)' : 'var(--color-text-secondary)',
                          textDecoration: isResolved ? 'line-through' : 'none',
                        }}
                      >
                        {g.skill}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Save success message */}
          {savedMessage && (
            <div
              style={{
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-3)',
                backgroundColor: savedMessage.startsWith('Save failed')
                  ? 'rgba(239,68,68,0.10)'
                  : 'rgba(34,197,94,0.10)',
                border: `1px solid ${savedMessage.startsWith('Save failed') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: savedMessage.startsWith('Save failed') ? 'var(--color-danger)' : 'var(--color-success)',
                fontWeight: 500,
              }}
            >
              {savedMessage}
            </div>
          )}

          {/* Save buttons */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button
              onClick={() => { setSaveAsNew(false); setShowConfirm(true) }}
              disabled={!canSave || saving}
              style={{
                padding: '8px 16px',
                backgroundColor: canSave && !saving ? 'var(--color-accent)' : 'var(--color-bg-raised)',
                color: canSave && !saving ? 'white' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
              }}
            >
              {saving && !saveAsNew && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'ov-spin 0.8s linear infinite',
                  }}
                />
              )}
              Save optimized variant
            </button>
            <button
              onClick={() => { setSaveAsNew(true); setNewVariantName(`${analysis?.variantName ?? 'Variant'} (optimized)`); setShowConfirm(true) }}
              disabled={!canSave || saving}
              style={{
                padding: '7px 16px',
                backgroundColor: 'transparent',
                color: canSave && !saving ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                border: `1px solid ${canSave && !saving ? 'var(--color-border-default)' : 'var(--color-border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
              }}
            >
              {saving && saveAsNew && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(160,160,168,0.4)',
                    borderTopColor: 'var(--color-text-secondary)',
                    borderRadius: '50%',
                    animation: 'ov-spin 0.8s linear infinite',
                  }}
                />
              )}
              Save as new variant
            </button>
            <button
              onClick={() => {
                // TODO Phase 11: navigate to submissions with company/role pre-filled
                onBack()
              }}
              style={{
                padding: '6px 16px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-tertiary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                textAlign: 'center',
              }}
            >
              Log submission
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmation dialog (inline overlay) */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-overlay)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              maxWidth: 440,
              width: '90%',
              fontFamily: 'var(--font-sans)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: '0 0 var(--space-3) 0',
              }}
            >
              Confirm changes
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 var(--space-4) 0',
              }}
            >
              This will update {acceptedCount} bullet{acceptedCount !== 1 ? 's' : ''} and add{' '}
              {addedSkillCount} skill{addedSkillCount !== 1 ? 's' : ''} in{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {analysis.variantName ?? 'this variant'}
              </strong>
              . Bullet text changes apply to all variants that include these bullets.
              {saveAsNew && (
                <>
                  {' '}
                  A copy of{' '}
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    {analysis.variantName ?? 'this variant'}
                  </strong>{' '}
                  will be created first.
                </>
              )}
            </p>
            {saveAsNew && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 500,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  New variant name
                </label>
                <input
                  type="text"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  placeholder={`${analysis.variantName ?? 'Variant'} (optimized)`}
                  style={{
                    width: '100%',
                    height: 36,
                    backgroundColor: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)',
                  }}
                  autoFocus
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: '7px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(saveAsNew)}
                style={{
                  padding: '7px 16px',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OptimizeVariant
