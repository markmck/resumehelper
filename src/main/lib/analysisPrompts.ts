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

Excluded-bullet suggestion guidelines:
- You will receive a list of base-experience bullets the candidate excluded from their active resume variant (tagged [B{id}] for reference).
- Review this list against the job's required and preferred skills, key responsibilities, and missing keywords.
- Suggest at most 3 excluded bullets that are GENUINELY relevant to this specific job's gaps — not just generally strong bullets.
- Rank suggestions by relevance: the most gap-closing bullet first.
- For each suggestion, provide: the bulletId (integer, from the [B{id}] tag), a brief reason (1 sentence why this bullet helps), and the matched_keywords (JD keywords this bullet addresses, subset of the job's keywords list).
- DO NOT suggest bullets that are already covered by the included resume text or are not relevant to the job gaps.
- DO NOT suggest a bullet if you cannot reliably read its [B{id}] integer — leave excluded_bullet_suggestions empty rather than guess an ID.
- If no excluded bullets are relevant, return an empty excluded_bullet_suggestions array.

Return only the structured scoring data, no commentary.`

  const prompt = `## Parsed Job Data
${JSON.stringify(parsedJob, null, 2)}

## Resume Text
${resumeText}
${excludedBulletsText ? `\n## Excluded Bullets (base experience not on your variant)\n${excludedBulletsText}` : ''}

Score this resume against the job data above. Be rigorous and accurate.`

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
