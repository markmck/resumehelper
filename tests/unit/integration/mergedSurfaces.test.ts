/** @vitest-environment jsdom */
import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'

// Top-level vi.mock for fs — hoisted by vitest to run before any test; placed here to satisfy
// the hoisting requirement and avoid the "not at top level" warning.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    promises: {
      ...(actual.promises as object),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  }
})
import { renderToString } from 'react-dom/server'
import { createTestDb } from '../../helpers/db'
import { seedVariant, seedProject, updateProfile, seedJob, seedBullet, seedJobPosting, seedAnalysis } from '../../helpers/factories'
import { unzipDocxXml } from '../../helpers/docx'
import { templateVariantItems } from '../../../src/main/db/schema'
import { buildMergedBuilderData } from '../../../src/main/lib/mergeHelper'
import { setVariantOverride, setAnalysisMargins, clearAnalysisMargins } from '../../../src/main/handlers/templates'
import { acceptExcludedBulletSuggestion, ensureExcludedBulletSuggestions } from '../../../src/main/handlers/ai'
import { buildResumeDocx } from '../../../src/main/lib/docxBuilder'
import type { BuilderData } from '../../../src/main/lib/docxBuilder'
import ClassicTemplate from '@renderer/components/templates/ClassicTemplate'
import ModernTemplate from '@renderer/components/templates/ModernTemplate'
import JakeTemplate from '@renderer/components/templates/JakeTemplate'
import MinimalTemplate from '@renderer/components/templates/MinimalTemplate'
import ExecutiveTemplate from '@renderer/components/templates/ExecutiveTemplate'
import type { ResumeTemplateProps } from '@renderer/components/templates/types'

const SUMMARY_SENTINEL = 'TEST_SUMMARY_TEXT_42'

const templates = [
  ['classic', ClassicTemplate],
  ['modern', ModernTemplate],
  ['jake', JakeTemplate],
  ['minimal', MinimalTemplate],
  ['executive', ExecutiveTemplate],
] as const

const matrix = templates.flatMap(
  ([key, Tmpl]) =>
    ([true, false] as const).map((showSummary) => [key, Tmpl, showSummary] as const),
)

function buildMinimalProps(showSummary: boolean): ResumeTemplateProps {
  return {
    profile: {
      id: 1,
      name: 'Jane Doe',
      email: 'j@x.com',
      phone: '555-0000',
      location: 'NY',
      linkedin: 'jane',
      summary: SUMMARY_SENTINEL,
    },
    jobs: [],
    skills: [],
    projects: [],
    education: [],
    volunteer: [],
    awards: [],
    publications: [],
    languages: [],
    interests: [],
    references: [],
    showSummary,
  }
}

function buildMinimalBuilderData(): BuilderData {
  return {
    jobs: [],
    skills: [],
    projects: [],
    education: [],
    volunteer: [],
    awards: [],
    publications: [],
    languages: [],
    interests: [],
    references: [],
  }
}

function buildMinimalProfileRow() {
  return {
    name: 'Jane Doe',
    email: 'j@x.com',
    phone: '555-0000',
    location: 'NY',
    linkedin: 'jane',
    summary: SUMMARY_SENTINEL,
  }
}

describe('mergedSurfaces: HTML/PDF (via renderToString) honors showSummary', () => {
  test.each(matrix)(
    'renderToString %s with showSummary=%s honors summary visibility',
    (_key, Tmpl, showSummary) => {
      const props = buildMinimalProps(showSummary)
      const html = renderToString(
        React.createElement(Tmpl as React.ComponentType<ResumeTemplateProps>, props),
      )
      if (showSummary) {
        expect(html).toContain(SUMMARY_SENTINEL)
      } else {
        expect(html).not.toContain(SUMMARY_SENTINEL)
      }
    },
  )
})

describe('mergedSurfaces: DOCX (via XML) honors showSummary', () => {
  test.each(matrix)(
    'DOCX %s with showSummary=%s honors summary visibility',
    async (key, _Tmpl, showSummary) => {
      const builderData = buildMinimalBuilderData()
      const profileRow = buildMinimalProfileRow()
      const doc = buildResumeDocx(builderData, profileRow, key, {}, showSummary)
      const xml = await unzipDocxXml(doc)
      if (showSummary) {
        expect(xml).toContain(SUMMARY_SENTINEL)
      } else {
        expect(xml).not.toContain(SUMMARY_SENTINEL)
      }
    },
  )
})

describe('mergedSurfaces: D-09 no double-gap when showSummary=false in DOCX', () => {
  test('when showSummary=false, summary sentinel is absent and summary spacing collapses', async () => {
    const builderData = buildMinimalBuilderData()
    const profileRow = buildMinimalProfileRow()

    const docOn = buildResumeDocx(builderData, profileRow, 'classic', {}, true)
    const docOff = buildResumeDocx(builderData, profileRow, 'classic', {}, false)
    const xmlOn = await unzipDocxXml(docOn)
    const xmlOff = await unzipDocxXml(docOff)

    // Primary D-09 assertion: sentinel must not appear when showSummary=false
    expect(xmlOff).not.toContain(SUMMARY_SENTINEL)

    // Structural check: showSummary=false produces a smaller XML payload than
    // showSummary=true. Confirms both the paragraph and its spacing collapsed
    // (per docxBuilder.ts:122-130 — array becomes [] when showSummary=false).
    expect(xmlOff.length).toBeLessThan(xmlOn.length)
  })

  test('when showSummary=true, summary paragraph and sentinel are present', async () => {
    const builderData = buildMinimalBuilderData()
    const profileRow = buildMinimalProfileRow()
    const doc = buildResumeDocx(builderData, profileRow, 'classic', {}, true)
    const xml = await unzipDocxXml(doc)
    expect(xml).toContain(SUMMARY_SENTINEL)
  })
})

describe('mergedSurfaces: buildMergedBuilderData.showSummary derivation', () => {
  test('returns showSummary=true when no sentinel row exists (default path)', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const variant = seedVariant(db, { layoutTemplate: 'executive' })
    const merged = await buildMergedBuilderData(db, variant.id)
    expect(merged.showSummary).toBe(true)
  })

  test('returns showSummary=false when sentinel row has excluded=true', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    db.insert(templateVariantItems).values({
      variantId: variant.id,
      itemType: 'summary',
      excluded: true,
    }).run()
    const merged = await buildMergedBuilderData(db, variant.id)
    expect(merged.showSummary).toBe(false)
  })

  test('returns showSummary=true when sentinel row has excluded=false', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    db.insert(templateVariantItems).values({
      variantId: variant.id,
      itemType: 'summary',
      excluded: false,
    }).run()
    const merged = await buildMergedBuilderData(db, variant.id)
    expect(merged.showSummary).toBe(true)
  })
})

describe('mergedSurfaces: SC#1 variant-tier effective text flows through getBuilderData', () => {
  test('summaryOverride reflects a variant-tier summary override (no base summary)', async () => {
    const db = createTestDb()
    // D-04: variants may author a summary from scratch even with an empty base.
    updateProfile(db, {
      name: 'Jane',
      email: 'j@x.com',
      phone: '1',
      location: 'NY',
      linkedin: 'jane',
      summary: '',
    })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    // Locked tokens: entityType 'summary', field 'text', no FK ({}).
    setVariantOverride(db, variant.id, 'summary', 'text', {}, 'Variant summary')

    const merged = await buildMergedBuilderData(db, variant.id)
    expect(merged.summaryOverride).toBe('Variant summary')
  })

  test('project effective name reflects a variant-tier project_name override', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const project = seedProject(db, { name: 'Base Project Name' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })

    // Locked tokens: entityType 'project_name', field 'name', FK { projectId }.
    setVariantOverride(db, variant.id, 'project_name', 'name', { projectId: project.id }, 'Reworded Project')

    const merged = await buildMergedBuilderData(db, variant.id)
    const mergedProject = merged.projects.find((p) => p.id === project.id)
    expect(mergedProject).toBeDefined()
    expect(mergedProject!.name).toBe('Reworded Project')
  })
})

describe('mergedSurfaces: Test 9 — accepted excluded bullet flows through merge (SUG-02)', () => {
  test('after acceptExcludedBulletSuggestion, buildMergedBuilderData with analysisId yields excluded:false; without analysisId yields excluded:true', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const variant = seedVariant(db, { layoutTemplate: 'classic' })
    const job = seedJob(db)
    const bullet = seedBullet(db, job.id, { text: 'Excluded bullet text', sortOrder: 0 })

    // Mark the bullet as excluded from this variant
    db.insert(templateVariantItems).values({
      variantId: variant.id,
      itemType: 'bullet',
      bulletId: bullet.id,
      excluded: true,
    }).run()

    // Create an analysis tied to this variant
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Seed and accept the excluded-bullet suggestion (handlers not yet implemented — Plan 02)
    ensureExcludedBulletSuggestions(
      db,
      analysis.id,
      [{ bulletId: bullet.id, reason: 'relevant to job', matched_keywords: ['kw'] }],
      new Set([bullet.id]),
    )
    acceptExcludedBulletSuggestion(db, analysis.id, bullet.id)

    // With analysisId: inclusion row is loaded, bullet.excluded should be false
    const mergedWithAnalysis = await buildMergedBuilderData(db, variant.id, analysis.id)
    const allBulletsWithAnalysis = mergedWithAnalysis.jobs.flatMap((j) => j.bullets)
    const bulletWithAnalysis = allBulletsWithAnalysis.find((b) => b.id === bullet.id)
    expect(bulletWithAnalysis).toBeDefined()
    expect(bulletWithAnalysis!.excluded).toBe(false)

    // Without analysisId: variant unchanged, bullet should still be excluded
    const mergedWithoutAnalysis = await buildMergedBuilderData(db, variant.id)
    const allBulletsWithout = mergedWithoutAnalysis.jobs.flatMap((j) => j.bullets)
    const bulletWithout = allBulletsWithout.find((b) => b.id === bullet.id)
    expect(bulletWithout).toBeDefined()
    expect(bulletWithout!.excluded).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// SC#2 / SC#4 — Live-surface override/fallback via effectiveMargins
// Both live-PDF and live-DOCX surfaces now read from MergedBuilderData.effectiveMargins.
// These tests assert the merge path gives override values when set, and falls back to
// variant margins when the override is cleared — proving SC#2 and SC#4.
// ---------------------------------------------------------------------------
describe('mergedSurfaces: SC#2/SC#4 — effectiveMargins override/fallback on the live-surface merge path', () => {
  test('SC#2: with an analysis margin override set, effectiveMargins equals the override triple', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const variant = seedVariant(db, {
      layoutTemplate: 'classic',
      templateOptions: JSON.stringify({ marginTop: 0.75, marginBottom: 0.75, marginSides: 0.75 }),
    })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Set a distinct override triple
    await setAnalysisMargins(db, analysis.id, { marginTop: 0.5, marginBottom: 0.4, marginSides: 0.6 })

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)
    expect(merged.effectiveMargins.top).toBe(0.5)
    expect(merged.effectiveMargins.bottom).toBe(0.4)
    expect(merged.effectiveMargins.sides).toBe(0.6)
  })

  test('SC#4: after clearing the override, effectiveMargins falls back to variant templateOptions margins', async () => {
    const db = createTestDb()
    updateProfile(db, { name: 'Jane', email: 'j@x.com', phone: '1', location: 'NY', linkedin: 'jane' })
    const variant = seedVariant(db, {
      layoutTemplate: 'classic',
      templateOptions: JSON.stringify({ marginTop: 0.75, marginBottom: 0.8, marginSides: 0.9 }),
    })
    const posting = seedJobPosting(db)
    const analysis = seedAnalysis(db, posting.id, { variantId: variant.id })

    // Set then clear the override
    await setAnalysisMargins(db, analysis.id, { marginTop: 0.5, marginBottom: 0.4, marginSides: 0.6 })
    await clearAnalysisMargins(db, analysis.id)

    const merged = await buildMergedBuilderData(db, variant.id, analysis.id)
    // Should now reflect variant margins (not the cleared override)
    expect(merged.effectiveMargins.top).toBe(0.75)
    expect(merged.effectiveMargins.bottom).toBe(0.8)
    expect(merged.effectiveMargins.sides).toBe(0.9)
  })
})

// ---------------------------------------------------------------------------
// LAYOUT-04 replay guarantee — snapshot-replay PDF margin regression
// export:snapshotPdf reads snapOpts.marginTop/Bottom from a frozen snapshot.
// After this phase, buildSnapshotForVariant freezes effectiveMargins into those fields.
// This test locks the replay path: frozen templateOptions.margin* → printToPDF args.
// ---------------------------------------------------------------------------
describe('mergedSurfaces: LAYOUT-04 — snapshot-replay PDF renders frozen margins', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('export:snapshotPdf passes frozen marginTop/marginBottom to printToPDF and frozen marginSides to postMessage', async () => {
    // Import mocked electron module (global mock from tests/__mocks__/electron.ts)
    const electron = await import('electron')
    const { ipcMain, BrowserWindow: MockBrowserWindow, dialog } = electron as any

    // Spy on printToPDF — returns a Buffer
    const printToPDFSpy = vi.fn().mockResolvedValue(Buffer.from('pdf'))
    const executeJSSpy = vi.fn().mockResolvedValue(undefined)

    // Configure BrowserWindow mock for this test — must use function (not arrow) for constructor
    ;(MockBrowserWindow as any).mockImplementation(function () {
      return {
        show: false,
        loadURL: vi.fn().mockResolvedValue(undefined),
        loadFile: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn(),
        webContents: {
          printToPDF: printToPDFSpy,
          executeJavaScript: executeJSSpy,
          openDevTools: vi.fn(),
          send: vi.fn(),
        },
      }
    })

    // ipcMain.once needs to invoke cb immediately so handler doesn't hang on 3s timeout
    ;(ipcMain as any).once = vi.fn().mockImplementation((_channel: string, cb: () => void) => {
      cb()
    })

    // dialog.showSaveDialog returns a filePath
    ;(dialog as any).showSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/tmp/test.pdf' })

    // Capture the registered handler
    const capturedHandlers: Record<string, Function> = {}
    ;(ipcMain as any).handle = vi.fn().mockImplementation((channel: string, handler: Function) => {
      capturedHandlers[channel] = handler
    })

    // Register handlers — this populates capturedHandlers
    const { registerExportHandlers } = await import('../../../src/main/handlers/export')
    registerExportHandlers()

    const snapshotPdfHandler = capturedHandlers['export:snapshotPdf']
    expect(snapshotPdfHandler).toBeDefined()

    // Crafted snapshotData with pre-frozen effective margins
    const frozenMarginTop = 0.55
    const frozenMarginBottom = 0.45
    const frozenMarginSides = 0.65
    const snapshotData = {
      layoutTemplate: 'classic',
      templateOptions: {
        marginTop: frozenMarginTop,
        marginBottom: frozenMarginBottom,
        marginSides: frozenMarginSides,
        showSummary: true,
      },
      jobs: [],
      skills: [],
      projects: [],
      education: [],
      volunteer: [],
      awards: [],
      publications: [],
      languages: [],
      interests: [],
      references: [],
    }

    const fakeEvent = {} as Electron.IpcMainInvokeEvent
    await snapshotPdfHandler(fakeEvent, snapshotData, 'test.pdf')

    // Assert printToPDF received the frozen margin values
    expect(printToPDFSpy).toHaveBeenCalledOnce()
    const printArgs = printToPDFSpy.mock.calls[0][0]
    expect(printArgs.margins.top).toBe(frozenMarginTop)
    expect(printArgs.margins.bottom).toBe(frozenMarginBottom)

    // Assert executeJavaScript postMessage string contains frozen marginSides
    expect(executeJSSpy).toHaveBeenCalledOnce()
    const jsStr = executeJSSpy.mock.calls[0][0] as string
    expect(jsStr).toContain(String(frozenMarginSides))
  })
})
