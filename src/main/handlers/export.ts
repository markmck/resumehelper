import { ipcMain, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { promises as fs } from 'fs'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition
} from 'docx'
import { db } from '../db'
import { profile, jobs, jobBullets, skills, templateVariantItems } from '../db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import { BuilderJob, BuilderSkill } from '../../preload/index.d'

interface BuilderData {
  jobs: BuilderJob[]
  skills: BuilderSkill[]
}

async function getBuilderDataForVariant(variantId: number): Promise<BuilderData> {
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.startDate))
  const allBullets = await db.select().from(jobBullets).orderBy(asc(jobBullets.sortOrder))
  const allSkills = await db.select().from(skills)
  const exclusionItems = await db
    .select()
    .from(templateVariantItems)
    .where(eq(templateVariantItems.variantId, variantId))

  const excludedJobIds = new Set<number>()
  const excludedBulletIds = new Set<number>()
  const excludedSkillIds = new Set<number>()

  for (const item of exclusionItems) {
    if (!item.excluded) continue
    if (item.itemType === 'job' && item.jobId != null) excludedJobIds.add(item.jobId)
    if (item.itemType === 'bullet' && item.bulletId != null) excludedBulletIds.add(item.bulletId)
    if (item.itemType === 'skill' && item.skillId != null) excludedSkillIds.add(item.skillId)
  }

  const bulletsByJobId = new Map<number, typeof allBullets>()
  for (const bullet of allBullets) {
    if (!bulletsByJobId.has(bullet.jobId)) bulletsByJobId.set(bullet.jobId, [])
    bulletsByJobId.get(bullet.jobId)!.push(bullet)
  }

  const jobsWithBullets: BuilderJob[] = allJobs.map((job) => ({
    id: job.id,
    company: job.company,
    role: job.role,
    startDate: job.startDate,
    endDate: job.endDate,
    excluded: excludedJobIds.has(job.id),
    bullets: (bulletsByJobId.get(job.id) ?? []).map((b) => ({
      id: b.id,
      text: b.text,
      sortOrder: b.sortOrder,
      excluded: excludedBulletIds.has(b.id),
    })),
  }))

  const skillsWithExcluded: BuilderSkill[] = allSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    tags: JSON.parse(skill.tags) as string[],
    excluded: excludedSkillIds.has(skill.id),
  }))

  return { jobs: jobsWithBullets, skills: skillsWithExcluded }
}

export function registerExportHandlers(): void {
  ipcMain.handle('export:pdf', async (_, variantId: number, defaultFilename: string) => {
    // 1. Show Save As dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as PDF',
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    // 2. Create hidden BrowserWindow
    const win = new BrowserWindow({
      show: false,
      width: 816, // 8.5in * 96dpi
      height: 1056, // 11in * 96dpi
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    // 3. Load print route
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      await win.loadURL(
        `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=${variantId}`
      )
    } else {
      await win.loadFile(join(__dirname, '../renderer/print.html'), {
        query: { variantId: String(variantId) },
      })
    }

    // 4. Wait for React to signal readiness
    await new Promise<void>((resolve) => {
      ipcMain.once('print:ready', () => resolve())
      // Safety timeout — if signal never comes, proceed after 3 seconds
      setTimeout(() => resolve(), 3000)
    })

    // 5. Small settle delay for final paint
    await new Promise((r) => setTimeout(r, 200))

    // 6. Generate PDF
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    })

    win.destroy()

    // 7. Write to disk
    await fs.writeFile(filePath, pdfBuffer)
    return { canceled: false, filePath }
  })

  ipcMain.handle('export:docx', async (_, variantId: number, defaultFilename: string) => {
    // 1. Show Save As dialog
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as DOCX',
      defaultPath: defaultFilename,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    // 2. Fetch data directly from DB
    const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
    const builderData = await getBuilderDataForVariant(variantId)

    const includedJobs = builderData.jobs.filter((j) => !j.excluded)
    const includedSkills = builderData.skills.filter((s) => !s.excluded)

    // 3. Build DOCX document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } }, // 0.5in all sides (720 twips)
          },
          children: [
            // Name — centered, bold, 16pt (size: 32)
            new Paragraph({
              children: [
                new TextRun({
                  text: profileRow?.name || 'Your Name',
                  bold: true,
                  size: 32,
                  font: 'Calibri',
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            // Contact line — centered, 10pt (size: 20), gray
            new Paragraph({
              children: [
                new TextRun({
                  text: [
                    profileRow?.email,
                    profileRow?.phone,
                    profileRow?.location,
                    profileRow?.linkedin,
                  ]
                    .filter(Boolean)
                    .join('  |  '),
                  size: 20,
                  font: 'Calibri',
                  color: '555555',
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            // WORK EXPERIENCE section
            ...(includedJobs.length > 0
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'WORK EXPERIENCE',
                        bold: true,
                        size: 22,
                        font: 'Calibri',
                        color: '333333',
                      }),
                    ],
                    border: {
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                    },
                    spacing: { before: 240, after: 120 },
                  }),
                  ...includedJobs.flatMap((job) => {
                    const bullets = job.bullets.filter((b) => !b.excluded)
                    return [
                      new Paragraph({
                        children: [
                          new TextRun({ text: job.role, bold: true, size: 22, font: 'Calibri' }),
                          new TextRun({
                            text: `\t${job.startDate} \u2014 ${job.endDate || 'Present'}`,
                            size: 20,
                            font: 'Calibri',
                            color: '555555',
                          }),
                        ],
                        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: job.company,
                            size: 20,
                            font: 'Calibri',
                            color: '555555',
                          }),
                        ],
                        spacing: { after: 60 },
                      }),
                      ...bullets.map(
                        (b) =>
                          new Paragraph({
                            children: [
                              new TextRun({ text: b.text, size: 22, font: 'Calibri' }),
                            ],
                            bullet: { level: 0 },
                            spacing: { after: 40 },
                          })
                      ),
                      new Paragraph({ spacing: { after: 120 } }),
                    ]
                  }),
                ]
              : []),
            // SKILLS section
            ...(includedSkills.length > 0
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'SKILLS',
                        bold: true,
                        size: 22,
                        font: 'Calibri',
                        color: '333333',
                      }),
                    ],
                    border: {
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                    },
                    spacing: { before: 240, after: 120 },
                  }),
                  ...Object.entries(
                    includedSkills.reduce<Record<string, string[]>>((acc, skill) => {
                      const group = skill.tags.length > 0 ? skill.tags[0] : 'Other'
                      if (!acc[group]) acc[group] = []
                      acc[group].push(skill.name)
                      return acc
                    }, {})
                  ).map(
                    ([group, names]) =>
                      new Paragraph({
                        children: [
                          new TextRun({ text: `${group}: `, bold: true, size: 22, font: 'Calibri' }),
                          new TextRun({ text: names.join(', '), size: 22, font: 'Calibri' }),
                        ],
                        spacing: { after: 60 },
                      })
                  ),
                ]
              : []),
          ],
        },
      ],
    })

    // 4. Generate buffer and write
    const buffer = await Packer.toBuffer(doc)
    await fs.writeFile(filePath, buffer)
    return { canceled: false, filePath }
  })
}
