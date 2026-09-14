import type { ParsedJob } from './aiProvider'

// ─── Job Parser Prompt ────────────────────────────────────────────────────────

export function buildJobParserPrompt(rawText: string): { system: string; prompt: string } {
  const system = `You are an expert at parsing job postings. Your task is to extract structured information from job posting text.

Guidelines:
- Extract keywords that a candidate would naturally include on their resume (technologies, methodologies, tools, soft skills, domain terms)
- Carefully distinguish required skills (must have) from preferred skills (nice to have / bonus)
- Experience years: extract the minimum required years if mentioned, otherwise null
- Education requirement: extract the degree or certification if explicitly required, otherwise null
- Key responsibilities: extract the main job duties as concise action-oriented phrases
- Be comprehensive with keywords — include both explicit mentions and implied terminology

Return only the structured data, no commentary.`

  const prompt = `Parse the following job posting and extract structured information:\n\n${rawText}`

  return { system, prompt }
}

// ─── Resume Scorer Prompt ─────────────────────────────────────────────────────

export function buildScorerPrompt(
  resumeText: string,
  parsedJob: ParsedJob,
  excludedBulletsText?: string,
  excludedProjectsText?: string,
): { system: string; prompt: string } {
  const system = `You are an expert resume analyst and ATS (Applicant Tracking System) specialist. Your task is to score a resume against a parsed job description.

Scoring guidelines:
- keyword_score (0-100): How well the resume's language matches the job posting keywords. Distinguish exact matches (same word/phrase) from semantic matches (synonymous or closely related terms). Be strict — partial overlap is not a full match.
- skills_score (0-100): How well the candidate's demonstrated skills match the required and preferred skills. Missing required skills significantly lower this score.
- experience_score (0-100): How well the candidate's experience level, industry background, and role history match the job requirements. Consider years of experience and relevance.
- ats_score (0-100): How ATS-friendly the resume is — proper section headers, no tables/graphics in text representation, standard date formats, quantified achievements, action verbs.

Gap analysis guidelines:
- severity "critical": Required skill or qualification that is completely absent from the resume
- severity "moderate": Preferred skill that is missing, or a required skill that is present but underrepresented
- category: Suggest a skill category for each gap (e.g., "Programming Languages", "Cloud & DevOps", "Frameworks", "Tools", "Soft Skills"). Use categories that match the resume's existing skill groupings when possible.

Rewrite suggestion guidelines (CRITICAL):
- NEVER fabricate experience, accomplishments, or skills the candidate does not have
- ONLY suggest rewording of existing bullet points to better incorporate job posting language
- Each suggestion must reference an existing bullet (using the [B{id}] marker) and only rephrase it to highlight the most relevant keywords
- Keep rewrites truthful and professional — no exaggeration

Length discipline — a rewrite must never grow the resume:
- PRESERVE every number already in the bullet, verbatim. Percentages, user counts, transaction volumes, team sizes and timeframes are the most valuable content on the resume — never drop, round, or soften one to make room for a keyword.
- suggested_text MUST NOT be longer than original_text. Shorter is better.
- Never exceed 240 characters. A bullet that wraps past two printed lines does not get read.
- Earn keywords by SUBSTITUTION, not addition: replace vague wording with the job's precise term (e.g. "cloud services" becomes "Azure PaaS"). Do not append trailing benefit clauses, parenthetical lists, or summarizing tails such as "— improving scalability and reliability".
- If a keyword cannot be worked in without making the bullet longer than the original, leave that keyword out entirely rather than appending it.

Non-duplication:
- Each target keyword may appear in AT MOST ONE suggestion. Never spread the same keyword across multiple bullets — repeating a term does not improve matching and costs space.
- Before adding a keyword, check whether it already appears anywhere in the resume text — another bullet, a project entry, or the skills list. If it is already present, do not add it again.
- Do not reuse distinctive phrases across your suggestions. Two bullets that read alike are worse than one that reads well.
- Work-experience bullets and project entries describe the same career. Never suggest wording that restates what another section already says: the work bullet states the capability, the project entry proves it with specifics (client, scale, the hard technical problem).

Excluded-bullet suggestion guidelines:
- You will receive a list of base-experience bullets the candidate excluded from their active resume variant (tagged [B{id}] for reference).
- Review this list against the job's required and preferred skills, key responsibilities, and missing keywords.
- Suggest at most 3 excluded bullets that are GENUINELY relevant to this specific job's gaps — not just generally strong bullets.
- Rank suggestions by relevance: the most gap-closing bullet first.
- For each suggestion, provide: the bulletId (integer, from the [B{id}] tag), a brief reason (1 sentence why this bullet helps), and the matched_keywords (JD keywords this bullet addresses, subset of the job's keywords list).
- DO NOT suggest bullets that are already covered by the included resume text or are not relevant to the job gaps.
- DO NOT suggest a bullet if you cannot reliably read its [B{id}] integer — leave excluded_bullet_suggestions empty rather than guess an ID.
- If no excluded bullets are relevant, return an empty excluded_bullet_suggestions array.

Excluded-project suggestion guidelines (project_suggestions field):
- You will receive a list of whole PROJECTS the candidate excluded from their active resume variant (tagged [P{id}] for reference), each with its bullet highlights.
- Review this list against the job's required and preferred skills, key responsibilities, and missing keywords.
- Suggest at most 3 excluded projects that are GENUINELY relevant to this specific job's gaps — not just generally impressive projects.
- Rank suggestions by relevance: the most gap-closing project first.
- For each suggestion, provide: the projectId (integer, from the [P{id}] tag), a brief reason (1 sentence why this project helps), and the matched_keywords (JD keywords this project addresses, subset of the job's keywords list).
- DO NOT suggest a project that is already covered by the included resume text or is not relevant to the job gaps.
- DO NOT suggest a project if you cannot reliably read its [P{id}] integer — leave project_suggestions empty rather than guess an ID.
- If no excluded projects are relevant, return an empty project_suggestions array.

Summary suggestion guidelines (suggested_summary field):
- Write a 2–4 sentence professional summary tailored to THIS specific job posting.
- The summary should highlight the candidate's most relevant experience and incorporate the job's key keywords naturally.
- Base the summary ONLY on skills and experience present in the resume — do NOT fabricate experience, titles, or credentials.
- If the candidate's profile has no summary section, write one from scratch based on their resume facts.
- Return an empty string if you cannot write a credible job-tailored summary from the resume content.

Return only the structured scoring data, no commentary.`

  const prompt = `## Parsed Job Data
${JSON.stringify(parsedJob, null, 2)}

## Resume Text
${resumeText}
${excludedBulletsText ? `\n## Excluded Bullets (base experience not on your variant)\n${excludedBulletsText}` : ''}
${excludedProjectsText ? `\n## Excluded Projects (projects not on your variant)\n${excludedProjectsText}` : ''}

Score this resume against the job data above. Be rigorous and accurate.`

  return { system, prompt }
}

// ─── Cover Letter Prompt ──────────────────────────────────────────────────────

export type LetterTone = 'formal' | 'direct' | 'plain' | 'neutral'

/**
 * Derives the cover letter's tone from the resume variant's layoutTemplate (D-07).
 * No new tone setting is introduced — the variant is already chosen for the submission.
 */
export function resolveLetterTone(layoutTemplate: string | null | undefined): LetterTone {
  switch (layoutTemplate) {
    case 'executive':
      return 'formal'
    case 'modern':
      return 'direct'
    case 'jake':
      return 'plain'
    default:
      return 'neutral'
  }
}

export function buildCoverLetterPrompt(
  resumeText: string,
  parsedJob: ParsedJob,
  tone: LetterTone,
  candidateName: string,
): { system: string; prompt: string } {
  const system = `You are an expert career writer composing a job-tailored cover letter.

Structure (CRITICAL):
- Write EXACTLY 3 paragraphs:
  1. A hook naming the specific role being applied for
  2. Evidence matched to the posting's top requirements, drawn only from the candidate's resume
  3. A close
- Target length: approximately 250 words total. Be concise — select only the strongest evidence.
- Tone: ${tone}. Write the entire letter in a ${tone} tone.

Grounding rules (CRITICAL):
- Base the letter ONLY on skills and experience present in the resume — do NOT fabricate experience, titles, or credentials.
- For job requirements the resume does not support, say nothing about them. Do not raise gaps, and do not attempt to bridge unrelated or transferable experience to imply a match that isn't there.
- The candidate's motivation for this specific company does not exist anywhere in the resume data. Include exactly one placeholder for it, written literally as: [why this company — your words]. Invent nothing about the company.

Format:
- Open the letter with the greeting: Dear Hiring Manager,
- Close the letter with the candidate's name as the signature: ${candidateName}
- Return only the letter text — no commentary, no markdown, no headings.`

  const prompt = `## Candidate Resume
${resumeText}

## Job Posting
${JSON.stringify(parsedJob, null, 2)}

Write the cover letter for ${candidateName} following the system instructions above.`

  return { system, prompt }
}

// ─── Resume Text Renderer ─────────────────────────────────────────────────────

export function buildResumeTextForLlm(resumeJson: Record<string, unknown>): string {
  const lines: string[] = []

  // Basics / Contact
  const basics = resumeJson['basics'] as Record<string, unknown> | undefined
  if (basics) {
    if (basics['name']) lines.push(`# ${basics['name']}`)
    const contactParts: string[] = []
    if (basics['email']) contactParts.push(String(basics['email']))
    if (basics['phone']) contactParts.push(String(basics['phone']))
    const location = basics['location'] as Record<string, unknown> | undefined
    if (location?.['city']) contactParts.push(String(location['city']))
    if (contactParts.length > 0) lines.push(contactParts.join(' | '))
    lines.push('')
  }

  // Work Experience
  const work = resumeJson['work'] as Array<Record<string, unknown>> | undefined
  if (work && work.length > 0) {
    lines.push('## WORK EXPERIENCE')
    for (const job of work) {
      const position = job['position'] ?? ''
      const company = job['name'] ?? ''
      const startDate = job['startDate'] ?? ''
      const endDate = job['endDate'] ?? 'Present'
      lines.push(`### ${position} — ${company}`)
      lines.push(`${startDate} — ${endDate}`)
      const highlights = job['highlights'] as Array<unknown> | undefined
      if (highlights && highlights.length > 0) {
        for (const highlight of highlights) {
          lines.push(`• ${highlight}`)
        }
      }
      lines.push('')
    }
  }

  // Skills
  const skills = resumeJson['skills'] as Array<Record<string, unknown>> | undefined
  if (skills && skills.length > 0) {
    lines.push('## SKILLS')
    for (const skillGroup of skills) {
      const name = skillGroup['name'] ?? ''
      const keywords = skillGroup['keywords'] as Array<unknown> | undefined
      if (keywords && keywords.length > 0) {
        lines.push(`${name}: ${keywords.join(', ')}`)
      }
    }
    lines.push('')
  }

  // Projects
  const projects = resumeJson['projects'] as Array<Record<string, unknown>> | undefined
  if (projects && projects.length > 0) {
    lines.push('## PROJECTS')
    for (const project of projects) {
      lines.push(`### ${project['name']}`)
      const highlights = project['highlights'] as Array<unknown> | undefined
      if (highlights && highlights.length > 0) {
        for (const highlight of highlights) {
          lines.push(`• ${highlight}`)
        }
      }
      lines.push('')
    }
  }

  // Education
  const education = resumeJson['education'] as Array<Record<string, unknown>> | undefined
  if (education && education.length > 0) {
    lines.push('## EDUCATION')
    for (const edu of education) {
      const studyType = edu['studyType'] ?? ''
      const area = edu['area'] ?? ''
      const institution = edu['institution'] ?? ''
      const startDate = edu['startDate'] ?? ''
      const endDate = edu['endDate'] ?? 'Present'
      const degreeStr = [studyType, area].filter(Boolean).join(' in ')
      lines.push(`### ${degreeStr} — ${institution}`)
      lines.push(`${startDate} — ${endDate}`)
      if (edu['score']) lines.push(`Score: ${edu['score']}`)
      const courses = edu['courses'] as Array<unknown> | undefined
      if (courses && courses.length > 0) {
        lines.push(`Relevant courses: ${courses.join(', ')}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
