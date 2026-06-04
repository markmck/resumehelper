import { ipcMain, BrowserWindow, dialog } from 'electron'
import { join, dirname } from 'path'
import { is } from '@electron-toolkit/utils'
import { promises as fs } from 'fs'
import { Packer } from 'docx'
import { buildResumeDocx, DOCX_MARGIN_DEFAULTS } from '../lib/docxBuilder'
import { db } from '../db'
import { profile, templateVariants } from '../db/schema'
import { eq } from 'drizzle-orm'
import { buildMergedBuilderData } from '../lib/mergeHelper'
import { buildBaseResumeJson, ExportValidationError } from '../lib/baseResumeBuilder'
import { buildVariantResumeJson } from '../lib/variantResumeBuilder'
import { getSetting, setSetting } from '../lib/settings'

export function registerExportHandlers(): void {
  ipcMain.handle('export:pdf', async (_, variantId: number, defaultFilename: string, analysisId?: number) => {
    // 1. Show Save As dialog
    const lastDir = getSetting(db, 'lastExportDir')
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as PDF',
      defaultPath: lastDir ? join(lastDir, defaultFilename) : defaultFilename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    // 2. Determine layout: all v2.1 templates (classic/modern/jake/minimal/executive) use print.html path
    const variant = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
    const layoutTemplate = variant?.layoutTemplate ?? 'classic'

    // Parse templateOptions for margin values
    const marginDefaults = DOCX_MARGIN_DEFAULTS[layoutTemplate] ?? { top: 1.0, bottom: 1.0, sides: 1.0 }
    let pdfMarginTop = marginDefaults.top
    let pdfMarginBottom = marginDefaults.bottom
    try {
      const opts = variant?.templateOptions ? JSON.parse(variant.templateOptions as string) : {}
      pdfMarginTop = opts.marginTop ?? marginDefaults.top
      pdfMarginBottom = opts.marginBottom ?? marginDefaults.bottom
    } catch {
      // keep defaults
    }

    // Load print.html + wait for print:ready signal
    const win = new BrowserWindow({
      show: false,
      width: 816, // 8.5in * 96dpi
      height: 1056, // 11in * 96dpi
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      let printUrl = `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=${variantId}&template=${layoutTemplate ?? 'classic'}`
      if (analysisId != null) printUrl += `&analysisId=${analysisId}`
      await win.loadURL(printUrl)
    } else {
      const query: Record<string, string> = { variantId: String(variantId), template: layoutTemplate ?? 'classic' }
      if (analysisId != null) query.analysisId = String(analysisId)
      await win.loadFile(join(__dirname, '../renderer/print.html'), { query })
    }

    // Wait for React to signal readiness
    await new Promise<void>((resolve) => {
      ipcMain.once('print:ready', () => resolve())
      // Safety timeout — if signal never comes, proceed after 3 seconds
      setTimeout(() => resolve(), 3000)
    })

    // Small settle delay for final paint
    await new Promise((r) => setTimeout(r, 200))

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: pdfMarginTop, bottom: pdfMarginBottom, left: 0, right: 0 },
    })
    win.destroy()
    await fs.writeFile(filePath, pdfBuffer)
    setSetting(db, 'lastExportDir', dirname(filePath))
    return { canceled: false, filePath }
  })

  ipcMain.handle('export:docx', async (_, variantId: number, defaultFilename: string, analysisId?: number) => {
    const lastDir = getSetting(db, 'lastExportDir')
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as DOCX',
      defaultPath: lastDir ? join(lastDir, defaultFilename) : defaultFilename,
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    const variant = db.select().from(templateVariants).where(eq(templateVariants.id, variantId)).get()
    const layoutTemplate = variant?.layoutTemplate ?? 'classic'
    let templateOptions: { marginTop?: number; marginBottom?: number; marginSides?: number; skillsDisplay?: string; accentColor?: string } = {}
    if (variant?.templateOptions) {
      try {
        templateOptions = typeof variant.templateOptions === 'string'
          ? JSON.parse(variant.templateOptions)
          : (variant.templateOptions as typeof templateOptions)
      } catch {
        templateOptions = {}
      }
    }
    const profileRow = db.select().from(profile).where(eq(profile.id, 1)).get()
    const merged = await buildMergedBuilderData(db, variantId, analysisId)
    const { showSummary, ...builderData } = merged

    const doc = buildResumeDocx(builderData, profileRow, layoutTemplate, templateOptions, showSummary)
    const buffer = await Packer.toBuffer(doc)
    await fs.writeFile(filePath, buffer)
    setSetting(db, 'lastExportDir', dirname(filePath))
    return { canceled: false, filePath }
  })

  // V2.1 template keys — all use the print.html pipeline
  const V2_TEMPLATES = new Set(['classic', 'modern', 'jake', 'minimal', 'executive'])

  ipcMain.handle('export:snapshotPdf', async (_, snapshotData: {
    layoutTemplate?: string
    templateOptions?: { accentColor?: string; skillsDisplay?: string; marginTop?: number; marginBottom?: number; marginSides?: number; showSummary?: boolean }
    jobs?: unknown[]
    skills?: unknown[]
    projects?: unknown[]
    education?: unknown[]
    volunteer?: unknown[]
    awards?: unknown[]
    publications?: unknown[]
    languages?: unknown[]
    interests?: unknown[]
    references?: unknown[]
  }, defaultFilename: string) => {
    // 1. Show Save As dialog
    const lastDir = getSetting(db, 'lastExportDir')
    const fallbackName = defaultFilename ?? 'resume-snapshot.pdf'
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Snapshot as PDF',
      defaultPath: lastDir ? join(lastDir, fallbackName) : fallbackName,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    // 2. Resolve template key — old snapshots (professional/traditional/unknown) fall back to classic
    const rawTemplate = snapshotData?.layoutTemplate ?? ''
    const resolvedTemplate = V2_TEMPLATES.has(rawTemplate) ? rawTemplate : 'classic'

    // 3. Use frozen profile from snapshot, fall back to live DB for old snapshots
    const frozenProfile = (snapshotData as { profile?: { name: string; email: string; phone: string; location: string; linkedin: string; summary?: string } }).profile
    const profileRow = frozenProfile ?? db.select().from(profile).where(eq(profile.id, 1)).get()

    // 4. Build payload matching PrintApp's expected shape
    const payload = {
      profile: profileRow ?? { id: 1, name: '', email: '', phone: '', location: '', linkedin: '', summary: '' },
      jobs: snapshotData?.jobs ?? [],
      skills: snapshotData?.skills ?? [],
      projects: snapshotData?.projects ?? [],
      education: snapshotData?.education ?? [],
      volunteer: snapshotData?.volunteer ?? [],
      awards: snapshotData?.awards ?? [],
      publications: snapshotData?.publications ?? [],
      languages: snapshotData?.languages ?? [],
      interests: snapshotData?.interests ?? [],
      references: snapshotData?.references ?? [],
    }

    // 6. Create a hidden BrowserWindow with preload for IPC support
    const win = new BrowserWindow({
      show: false,
      width: 816,
      height: 1056,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
      },
    })

    // 7. Load print.html with variantId=0 (snapshot sentinel) and resolved template
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      await win.loadURL(
        `${process.env['ELECTRON_RENDERER_URL']}/print.html?variantId=0&template=${resolvedTemplate}`
      )
    } else {
      await win.loadFile(join(__dirname, '../renderer/print.html'), {
        query: { variantId: '0', template: resolvedTemplate },
      })
    }

    // 8. Wait for PrintApp to signal it's ready to receive data (print:ready IPC)
    await new Promise<void>((resolve) => {
      ipcMain.once('print:ready', () => resolve())
      // Safety timeout — if signal never comes, proceed after 3 seconds
      setTimeout(() => resolve(), 3000)
    })

    // 9. Push snapshot data to PrintApp via postMessage using executeJavaScript
    const marginDefaults = DOCX_MARGIN_DEFAULTS[resolvedTemplate] ?? { top: 1.0, bottom: 1.0, sides: 1.0 }
    const snapOpts = snapshotData?.templateOptions
    const pdfMarginTop = snapOpts?.marginTop ?? marginDefaults.top
    const pdfMarginBottom = snapOpts?.marginBottom ?? marginDefaults.bottom
    await win.webContents.executeJavaScript(
      `window.postMessage(${JSON.stringify({
        type: 'print-data',
        template: resolvedTemplate,
        showSummary: snapOpts?.showSummary ?? true,
        accentColor: snapOpts?.accentColor,
        skillsDisplay: snapOpts?.skillsDisplay,
        marginTop: pdfMarginTop,
        marginBottom: pdfMarginBottom,
        marginSides: snapOpts?.marginSides ?? marginDefaults.sides,
        payload,
      })}, '*')`
    )

    // 10. Settle delay to let React render
    await new Promise((r) => setTimeout(r, 500))

    // 11. Print to PDF — margins match what was sent to PrintApp
    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'Letter',
      margins: { top: pdfMarginTop, bottom: pdfMarginBottom, left: 0, right: 0 },
    })
    win.destroy()
    await fs.writeFile(filePath, pdfBuffer)
    setSetting(db, 'lastExportDir', dirname(filePath))
    return { canceled: false, filePath }
  })

  ipcMain.handle('export:json', async (_, defaultFilename: string) => {
    let resumeJson
    try {
      resumeJson = buildBaseResumeJson(db)
    } catch (err) {
      if (err instanceof ExportValidationError) {
        const issues = err.issues
        const preview = issues.slice(0, 5)
          .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('\n')
        dialog.showErrorBox(
          'Export Failed: Invalid Resume Data',
          `Your resume contains fields that don't match the required format.\n\nIssues:\n${preview}\n\n(Showing first ${Math.min(5, issues.length)} of ${issues.length} issues. See application logs for the complete list.)`
        )
        console.error('[export:json] validation failed:', issues)
        return { canceled: true, error: 'validation' as const }
      }
      throw err
    }

    const lastDir = getSetting(db, 'lastExportDir')
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Resume as JSON',
      defaultPath: lastDir ? join(lastDir, defaultFilename) : defaultFilename,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    })
    if (canceled || !filePath) return { canceled: true }

    await fs.writeFile(filePath, JSON.stringify(resumeJson, null, 2))
    setSetting(db, 'lastExportDir', dirname(filePath))
    return { canceled: false, filePath }
  })

  ipcMain.handle(
    'export:variantJson',
    async (_, variantId: number, defaultFilename: string, analysisId?: number) => {
      // D-19 step 1: validate-first — build BEFORE save dialog
      let resumeJson
      try {
        resumeJson = await buildVariantResumeJson(db, variantId, analysisId)
      } catch (err) {
        if (err instanceof ExportValidationError) {
          const issues = err.issues
          const preview = issues
            .slice(0, 5)
            .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
            .join('\n')
          dialog.showErrorBox(
            'Export Failed: Invalid Resume Data',
            `Your resume contains fields that don't match the required format.\n\nIssues:\n${preview}\n\n(Showing first ${Math.min(5, issues.length)} of ${issues.length} issues. See application logs for the complete list.)`
          )
          console.error('[export:variantJson] validation failed:', issues)
          return { canceled: true, error: 'validation' as const }
        }
        throw err
      }

      // D-19 step 2-3: lastExportDir + save dialog
      const lastDir = getSetting(db, 'lastExportDir')
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Resume as JSON',
        defaultPath: lastDir ? join(lastDir, defaultFilename) : defaultFilename,
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      })
      if (canceled || !filePath) return { canceled: true }

      // D-19 step 4: write + persist lastExportDir
      await fs.writeFile(filePath, JSON.stringify(resumeJson, null, 2))
      setSetting(db, 'lastExportDir', dirname(filePath))
      return { canceled: false, filePath }
    }
  )
}
