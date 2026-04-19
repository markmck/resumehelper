import { describe, test, expect } from 'vitest'
import { Packer } from 'docx'
import { unzipSync } from 'fflate'
import { buildResumeDocx, DOCX_FONT_MAP, DOCX_MARGIN_DEFAULTS } from '../../../../src/main/lib/docxBuilder'
import type { BuilderData } from '../../../../src/main/lib/docxBuilder'

async function unzipDocxXml(doc: ReturnType<typeof buildResumeDocx>): Promise<string> {
  const buffer = await Packer.toBuffer(doc)
  const uint8 = new Uint8Array(buffer)
  const files = unzipSync(uint8)
  return new TextDecoder('utf-8').decode(files['word/document.xml'])
}

function buildTestProfile() {
  return {
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0199',
    location: 'San Francisco, CA',
    linkedin: 'janesmith',
    summary: null,
  }
}

function buildTestBuilderData(): BuilderData {
  return {
    jobs: [
      {
        id: 1,
        company: 'Acme Corp',
        role: 'Senior Engineer',
        startDate: '2023-01',
        endDate: null,
        excluded: false,
        bullets: [
          { id: 1, text: 'Designed scalable microservices architecture', sortOrder: 0, excluded: false },
        ],
      },
    ],
    skills: [
      { id: 1, name: 'TypeScript', tags: [], categoryId: null, categoryName: 'Languages', excluded: false },
    ],
    projects: [
      {
        id: 1,
        name: 'OpenSource Tool',
        sortOrder: 0,
        excluded: false,
        bullets: [{ id: 1, text: 'Built CLI tool for automation', sortOrder: 0, excluded: false }],
      },
    ],
    education: [
      {
        id: 1,
        institution: 'MIT',
        area: 'Computer Science',
        studyType: 'BS',
        startDate: '2018',
        endDate: '2022',
        score: '',
        courses: [],
        excluded: false,
      },
    ],
    volunteer: [],
    awards: [],
    publications: [],
    languages: [],
    interests: [],
    references: [],
  }
}

const templateKeys = ['classic', 'modern', 'jake', 'minimal', 'executive'] as const

describe('buildResumeDocx', () => {
  const profileRow = buildTestProfile()
  const builderData = buildTestBuilderData()

  test.each(templateKeys)('uses correct font for %s template', async (key) => {
    const doc = buildResumeDocx(builderData, profileRow, key, {})
    const xml = await unzipDocxXml(doc)
    const expectedFont = DOCX_FONT_MAP[key]
    expect(xml).toContain(`w:ascii="${expectedFont}"`)
  })

  test.each(templateKeys)('applies correct default margins for %s template', async (key) => {
    const doc = buildResumeDocx(builderData, profileRow, key, {})
    const xml = await unzipDocxXml(doc)
    const defaults = DOCX_MARGIN_DEFAULTS[key]
    const expectedTop = Math.round(defaults.top * 1440)
    const expectedBottom = Math.round(defaults.bottom * 1440)
    const expectedSides = Math.round(defaults.sides * 1440)
    expect(xml).toContain(`w:top="${expectedTop}"`)
    expect(xml).toContain(`w:bottom="${expectedBottom}"`)
    expect(xml).toContain(`w:left="${expectedSides}"`)
    expect(xml).toContain(`w:right="${expectedSides}"`)
  })

  test('templateOptions margin overrides take precedence over defaults', async () => {
    const overrides = { marginTop: 0.5, marginBottom: 0.5, marginSides: 0.3 }
    const doc = buildResumeDocx(builderData, profileRow, 'classic', overrides)
    const xml = await unzipDocxXml(doc)
    // classic defaults are 1.0/1.0/1.0 — overrides should win
    expect(xml).toContain(`w:top="${Math.round(0.5 * 1440)}"`)    // 720
    expect(xml).toContain(`w:bottom="${Math.round(0.5 * 1440)}"`) // 720
    expect(xml).toContain(`w:left="${Math.round(0.3 * 1440)}"`)   // 432
    expect(xml).toContain(`w:right="${Math.round(0.3 * 1440)}"`)  // 432
  })

  test('contains profile name and contact info', async () => {
    const doc = buildResumeDocx(builderData, profileRow, 'classic', {})
    const xml = await unzipDocxXml(doc)
    expect(xml).toContain('Jane Smith')
    expect(xml).toContain('jane@example.com')
    expect(xml).toContain('555-0199')
  })

  test('contains section headings', async () => {
    const doc = buildResumeDocx(builderData, profileRow, 'classic', {})
    const xml = await unzipDocxXml(doc)
    expect(xml).toContain('WORK EXPERIENCE')
    expect(xml).toContain('SKILLS')
    expect(xml).toContain('EDUCATION')
    expect(xml).toContain('PROJECTS')
  })

  test('contains job bullet text', async () => {
    const doc = buildResumeDocx(builderData, profileRow, 'classic', {})
    const xml = await unzipDocxXml(doc)
    expect(xml).toContain('Designed scalable microservices architecture')
    expect(xml).toContain('Acme Corp')
    expect(xml).toContain('Senior Engineer')
  })
})
