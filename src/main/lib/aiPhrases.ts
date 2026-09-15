// ─── AI Phrase Cleanup ────────────────────────────────────────────────────────
//
// Deterministic pass over AI-authored resume text (rewrite suggestions and the
// suggested summary) that swaps machine-sounding words and em-dashes for plainer
// wording. No LLM call; runs after the scorer returns.
//
// Adapted from srbhr/Resume-Matcher (prompts/refinement.py), with three changes:
//   - Whole-word, longest-first matching. Theirs is unordered substring
//     replacement, so "robust" rewrites "robustness".
//   - Precise engineering terms are NOT listed: architected, scalable, robust,
//     stakeholder(s), deliverables, facilitated, bandwidth. Replacing them loses
//     meaning on a software resume.
//   - A phrase is left alone when it appears in the job posting (the posting's
//     own language is what the rewrite is aiming for) or in the source text the
//     AI was working from (the user's own voice, not the model's).

// [phrase (lowercase), replacement]. An empty replacement deletes the phrase.
const WORD_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  // Inflated action verbs
  ['spearheaded', 'led'],
  ['spearheading', 'leading'],
  ['leverage', 'use'],
  ['leverages', 'uses'],
  ['leveraged', 'used'],
  ['leveraging', 'using'],
  ['utilize', 'use'],
  ['utilizes', 'uses'],
  ['utilized', 'used'],
  ['utilizing', 'using'],
  ['orchestrated', 'coordinated'],
  ['championed', 'pushed for'],
  ['synergized', 'collaborated'],
  ['revolutionized', 'transformed'],
  ['catalyzed', 'drove'],
  ['operationalized', 'implemented'],
  ['effectuated', 'carried out'],
  ['endeavored', 'worked'],
  ['fostered', 'built'],
  ['fostering', 'building'],
  ['empowered', 'enabled'],
  ['empowering', 'enabling'],
  // Buzzwords
  ['cutting-edge', 'modern'],
  ['bleeding-edge', 'modern'],
  ['best-in-class', 'leading'],
  ['world-class', 'high-quality'],
  ['game-changing', 'major'],
  ['impactful', 'effective'],
  ['actionable', 'practical'],
  ['holistic', 'complete'],
  ['seamless', 'smooth'],
  ['seamlessly', ''],
  ['proactively', ''],
  ['synergy', 'collaboration'],
  ['value-add', 'benefit'],
  ['proven track record', 'track record'],
  ['move the needle', 'make progress'],
  ['low-hanging fruit', 'quick wins'],
  ['deep dive', 'review'],
  // Filler
  ['in order to', 'to'],
  ['due to the fact that', 'because'],
  ['in the event that', 'if'],
  ['at this point in time', 'now'],
  ['on a daily basis', 'daily'],
  ['on a regular basis', 'regularly'],
  ['in a timely manner', 'promptly'],
]

// Longest first, so a multi-word phrase wins over any word inside it.
const WORD_RULES = [...WORD_REPLACEMENTS].sort((a, b) => b[0].length - a[0].length)

// Punctuation is only protected by the source text, not the job posting: a
// posting written with em-dashes says nothing about how the resume should read.
const PUNCTUATION_RULES: ReadonlyArray<{ symbol: string; pattern: RegExp }> = [
  { symbol: '—', pattern: /\s*—\s*/g },
  { symbol: '--', pattern: /\s*(?<!-)--(?!-)\s*/g },
]

// Marks a deleted capitalized phrase so the following word can take the capital.
const CAP_NEXT = ''

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Hyphens count as word characters so "cutting-edge" never matches inside a longer compound.
function containsPhrase(haystack: string, phrase: string): boolean {
  return new RegExp(`(?<![\\w-])${escapeRegExp(phrase)}(?![\\w-])`, 'i').test(haystack)
}

function matchCase(replacement: string, original: string): string {
  return /^[A-Z]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
}

function replacePhrase(text: string, phrase: string, replacement: string): string {
  // Optional leading article is captured so "an actionable plan" becomes "a practical plan".
  const re = new RegExp(`(?<![\\w-])(?:(an?)(\\s+))?(${escapeRegExp(phrase)})(?![\\w-])`, 'gi')
  return text.replace(re, (_match, article: string | undefined, space: string | undefined, word: string) => {
    const lead = article ? `${article}${space}` : ''
    if (replacement === '') {
      return lead + (/^[A-Z]/.test(word) ? CAP_NEXT : '')
    }
    const out = matchCase(replacement, word)
    if (!article) return out
    const fixedArticle = matchCase(/^[aeiou]/i.test(out) ? 'an' : 'a', article)
    return `${fixedArticle}${space}${out}`
  })
}

// Only runs when something was replaced, so untouched text is returned byte-for-byte.
function tidy(text: string): string {
  return text
    .replace(new RegExp(`${CAP_NEXT}\\s*([a-z])`, 'g'), (_m, c: string) => c.toUpperCase())
    .split(CAP_NEXT)
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    // (?=\s|$) keeps ".NET" and similar tokens attached to the word before them.
    .replace(/\s+([,.;:!?])(?=\s|$)/g, '$1')
    .replace(/,\s*([,.;:!?])(?=\s|$)/g, '$1')
    .replace(/^[\s,]+/, '')
    .replace(/[\s,]+$/, '')
}

export interface PhraseCleanupResult {
  text: string
  removed: string[]
}

export function cleanAiPhrases(
  text: string,
  opts: { jobText?: string; sourceText?: string; punctuationSourceText?: string } = {},
): PhraseCleanupResult {
  // punctuationSourceText exists because some source text is app-formatted rather than written
  // by the user: buildResumeTextForLlm puts an em-dash in every job header and date range.
  const { jobText = '', sourceText = '', punctuationSourceText = sourceText } = opts
  let out = text
  const removed: string[] = []

  for (const [phrase, replacement] of WORD_RULES) {
    if (!containsPhrase(out, phrase)) continue
    if (containsPhrase(jobText, phrase) || containsPhrase(sourceText, phrase)) continue
    out = replacePhrase(out, phrase, replacement)
    removed.push(phrase)
  }

  for (const { symbol, pattern } of PUNCTUATION_RULES) {
    if (!out.includes(symbol) || punctuationSourceText.includes(symbol)) continue
    const next = out.replace(pattern, ', ')
    if (next === out) continue
    out = next
    removed.push(symbol)
  }

  if (removed.length === 0) return { text, removed }
  return { text: tidy(out), removed }
}

interface ScorerProse {
  rewrite_suggestions: Array<{ original_text: string; suggested_text: string; target_keywords: string[] }>
  suggested_summary: string
}

/**
 * Applies cleanAiPhrases to the AI-authored prose in a scorer result. original_text is
 * the user's bullet and is never touched; each suggestion is protected by its own original,
 * the summary's wording by the full resume text it was written from. Returns a new object.
 */
export function cleanScorerProse<T extends ScorerProse>(
  score: T,
  ctx: { jobText: string; resumeText: string },
): { score: T; removed: string[] } {
  const removed = new Set<string>()

  const rewrite_suggestions = score.rewrite_suggestions.map((s) => {
    const result = cleanAiPhrases(s.suggested_text, { jobText: ctx.jobText, sourceText: s.original_text })
    result.removed.forEach((p) => removed.add(p))
    return result.text === s.suggested_text ? s : { ...s, suggested_text: result.text }
  })

  // resumeText protects words only. Its em-dashes come from the formatter's job headers and date
  // ranges, so letting it protect punctuation would disable em-dash cleanup for every summary.
  const summary = cleanAiPhrases(score.suggested_summary, {
    jobText: ctx.jobText,
    sourceText: ctx.resumeText,
    punctuationSourceText: '',
  })
  summary.removed.forEach((p) => removed.add(p))

  return {
    score: { ...score, rewrite_suggestions, suggested_summary: summary.text },
    removed: [...removed],
  }
}
