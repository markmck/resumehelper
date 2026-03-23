import { ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import { sqlite } from '../db'

interface ResumeJson {
  basics?: {
    name?: string
    email?: string
    phone?: string
    location?: { city?: string }
    profiles?: Array<{ url?: string }>
  }
  work?: Array<{
    name?: string
    position?: string
    startDate?: string
    endDate?: string
    highlights?: string[]
  }>
  skills?: Array<{
    name?: string
    keywords?: string[]
  }>
  projects?: Array<{
    name?: string
    highlights?: string[]
  }>
  education?: Array<{
    institution?: string
    area?: string
    studyType?: string
    startDate?: string
    endDate?: string
    score?: string
    courses?: string[]
  }>
  volunteer?: Array<{
    organization?: string
    position?: string
    startDate?: string
    endDate?: string
    summary?: string
    highlights?: string[]
  }>
  awards?: Array<{
    title?: string
    date?: string
    awarder?: string
    summary?: string
  }>
  publications?: Array<{
    name?: string
    publisher?: string
    releaseDate?: string
    url?: string
    summary?: string
  }>
  languages?: Array<{
    language?: string
    fluency?: string
  }>
  interests?: Array<{
    name?: string
    keywords?: string[]
  }>
  references?: Array<{
    name?: string
    reference?: string
  }>
}

const truncDate = (d: string | undefined | null): string | null =>
  d ? d.slice(0, 7) : null

export function registerImportHandlers(): void {
  ipcMain.handle('import:parseResumeJson', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import resume.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (canceled || filePaths.length === 0) {
      return { canceled: true }
    }

    let raw: string
    try {
      raw = await fs.readFile(filePaths[0], 'utf-8')
    } catch {
      return { canceled: false, error: 'Could not read file' }
    }

    let data: ResumeJson
    try {
      data = JSON.parse(raw) as ResumeJson
    } catch {
      return { canceled: false, error: 'Invalid JSON file' }
    }

    const counts = {
      jobs: (data.work ?? []).length,
      skills: (data.skills ?? []).reduce((sum, s) => sum + (s.keywords ?? []).length, 0),
      projects: (data.projects ?? []).length,
      education: (data.education ?? []).length,
      volunteer: (data.volunteer ?? []).length,
      awards: (data.awards ?? []).length,
      publications: (data.publications ?? []).length,
      languages: (data.languages ?? []).length,
      interests: (data.interests ?? []).length,
      references: (data.references ?? []).length,
      hasProfile: data.basics ? 1 : 0,
    }

    return { canceled: false, counts, data }
  })

  ipcMain.handle('import:confirmReplace', (_event, parsed: ResumeJson) => {
    const doImport = sqlite.transaction(() => {
      // Delete in child-first order to avoid FK issues
      sqlite.prepare('DELETE FROM template_variant_items').run()
      sqlite.prepare('DELETE FROM job_bullets').run()
      sqlite.prepare('DELETE FROM jobs').run()
      sqlite.prepare('DELETE FROM skills').run()
      sqlite.prepare('DELETE FROM project_bullets').run()
      sqlite.prepare('DELETE FROM projects').run()
      sqlite.prepare('DELETE FROM education').run()
      sqlite.prepare('DELETE FROM volunteer').run()
      sqlite.prepare('DELETE FROM awards').run()
      sqlite.prepare('DELETE FROM publications').run()
      sqlite.prepare('DELETE FROM languages').run()
      sqlite.prepare('DELETE FROM interests').run()
      sqlite.prepare('DELETE FROM "references"').run()

      // Import profile (UPDATE, not INSERT — row already exists from ensureSchema)
      if (parsed.basics) {
        sqlite
          .prepare('UPDATE profile SET name=?, email=?, phone=?, location=?, linkedin=? WHERE id=1')
          .run(
            parsed.basics.name ?? '',
            parsed.basics.email ?? '',
            parsed.basics.phone ?? '',
            parsed.basics.location?.city ?? '',
            parsed.basics.profiles?.[0]?.url ?? '',
          )
      }

      // Import work -> jobs + job_bullets
      for (const work of parsed.work ?? []) {
        const jobResult = sqlite
          .prepare(
            'INSERT INTO jobs (company, role, start_date, end_date) VALUES (?, ?, ?, ?)',
          )
          .run(
            work.name ?? '',
            work.position ?? '',
            truncDate(work.startDate) ?? '',
            truncDate(work.endDate),
          )
        const jobId = jobResult.lastInsertRowid
        for (let i = 0; i < (work.highlights ?? []).length; i++) {
          sqlite
            .prepare('INSERT INTO job_bullets (job_id, text, sort_order) VALUES (?, ?, ?)')
            .run(jobId, work.highlights![i], i)
        }
      }

      // Import skills — resume.json name is category, keywords are individual skills
      for (const skillGroup of parsed.skills ?? []) {
        const tag = skillGroup.name ?? ''
        for (const keyword of skillGroup.keywords ?? []) {
          sqlite
            .prepare('INSERT INTO skills (name, tags) VALUES (?, ?)')
            .run(keyword, JSON.stringify(tag ? [tag] : []))
        }
      }

      // Import projects -> projects + project_bullets
      for (let pi = 0; pi < (parsed.projects ?? []).length; pi++) {
        const project = parsed.projects![pi]
        const projectResult = sqlite
          .prepare('INSERT INTO projects (name, sort_order) VALUES (?, ?)')
          .run(project.name ?? '', pi)
        const projectId = projectResult.lastInsertRowid
        for (let i = 0; i < (project.highlights ?? []).length; i++) {
          sqlite
            .prepare(
              'INSERT INTO project_bullets (project_id, text, sort_order) VALUES (?, ?, ?)',
            )
            .run(projectId, project.highlights![i], i)
        }
      }

      // Import education
      for (const edu of parsed.education ?? []) {
        sqlite
          .prepare(
            'INSERT INTO education (institution, area, study_type, start_date, end_date, score, courses) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .run(
            edu.institution ?? '',
            edu.area ?? '',
            edu.studyType ?? '',
            truncDate(edu.startDate) ?? '',
            truncDate(edu.endDate),
            edu.score ?? '',
            JSON.stringify(edu.courses ?? []),
          )
      }

      // Import volunteer
      for (const vol of parsed.volunteer ?? []) {
        sqlite
          .prepare(
            'INSERT INTO volunteer (organization, position, start_date, end_date, summary, highlights) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run(
            vol.organization ?? '',
            vol.position ?? '',
            truncDate(vol.startDate) ?? '',
            truncDate(vol.endDate),
            vol.summary ?? '',
            JSON.stringify(vol.highlights ?? []),
          )
      }

      // Import awards
      for (const award of parsed.awards ?? []) {
        sqlite
          .prepare('INSERT INTO awards (title, date, awarder, summary) VALUES (?, ?, ?, ?)')
          .run(
            award.title ?? '',
            truncDate(award.date),
            award.awarder ?? '',
            award.summary ?? '',
          )
      }

      // Import publications
      for (const pub of parsed.publications ?? []) {
        sqlite
          .prepare(
            'INSERT INTO publications (name, publisher, release_date, url, summary) VALUES (?, ?, ?, ?, ?)',
          )
          .run(
            pub.name ?? '',
            pub.publisher ?? '',
            truncDate(pub.releaseDate),
            pub.url ?? '',
            pub.summary ?? '',
          )
      }

      // Import languages
      for (const lang of parsed.languages ?? []) {
        sqlite
          .prepare('INSERT INTO languages (language, fluency) VALUES (?, ?)')
          .run(lang.language ?? '', lang.fluency ?? '')
      }

      // Import interests
      for (const interest of parsed.interests ?? []) {
        sqlite
          .prepare('INSERT INTO interests (name, keywords) VALUES (?, ?)')
          .run(interest.name ?? '', JSON.stringify(interest.keywords ?? []))
      }

      // Import references
      for (const ref of parsed.references ?? []) {
        sqlite
          .prepare('INSERT INTO "references" (name, "reference") VALUES (?, ?)')
          .run(ref.name ?? '', ref.reference ?? '')
      }
    })

    doImport()
    return { success: true }
  })
}
