/** @vitest-environment jsdom */
import React from 'react'
import { describe, test, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createTestDb } from '../../helpers/db'
import { seedVariant, updateProfile } from '../../helpers/factories'
import { unzipDocxXml } from '../../helpers/docx'
import { templateVariantItems } from '../../../src/main/db/schema'
import { buildMergedBuilderData } from '../../../src/main/lib/mergeHelper'
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
