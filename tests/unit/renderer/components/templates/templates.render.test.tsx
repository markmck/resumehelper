/** @vitest-environment jsdom */
import React from 'react'
import { describe, test, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import ClassicTemplate from '@renderer/components/templates/ClassicTemplate'
import ModernTemplate from '@renderer/components/templates/ModernTemplate'
import JakeTemplate from '@renderer/components/templates/JakeTemplate'
import MinimalTemplate from '@renderer/components/templates/MinimalTemplate'
import ExecutiveTemplate from '@renderer/components/templates/ExecutiveTemplate'
import type { ResumeTemplateProps } from '@renderer/components/templates/types'

function buildMinimalTemplateProps(): ResumeTemplateProps {
  return {
    profile: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-0100',
      location: 'New York, NY',
      linkedin: 'johndoe',
      summary: '',
    },
    jobs: [
      {
        id: 1,
        company: 'Acme Corp',
        role: 'Engineer',
        startDate: '2023-01',
        endDate: null,
        excluded: false,
        bullets: [{ id: 1, text: 'Built key feature', sortOrder: 0, excluded: false }],
      },
    ],
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

const templates = [
  ['ClassicTemplate', ClassicTemplate],
  ['ModernTemplate', ModernTemplate],
  ['JakeTemplate', JakeTemplate],
  ['MinimalTemplate', MinimalTemplate],
  ['ExecutiveTemplate', ExecutiveTemplate],
] as const

describe('Template rendering', () => {
  test.each(templates)('%s renders without error', (_name, Template) => {
    const props = buildMinimalTemplateProps()
    expect(() => renderToString(React.createElement(Template as React.ComponentType<ResumeTemplateProps>, props))).not.toThrow()
  })

  test.each(templates)('%s output contains profile name', (_name, Template) => {
    const props = buildMinimalTemplateProps()
    const html = renderToString(React.createElement(Template as React.ComponentType<ResumeTemplateProps>, props))
    expect(html).toContain('John Doe')
  })

  test.each(templates)('%s output contains job company and role', (_name, Template) => {
    const props = buildMinimalTemplateProps()
    const html = renderToString(React.createElement(Template as React.ComponentType<ResumeTemplateProps>, props))
    expect(html).toContain('Acme Corp')
    expect(html).toContain('Engineer')
  })

  test.each(templates)('%s output contains bullet text', (_name, Template) => {
    const props = buildMinimalTemplateProps()
    const html = renderToString(React.createElement(Template as React.ComponentType<ResumeTemplateProps>, props))
    expect(html).toContain('Built key feature')
  })

  test.each(templates)('%s output contains experience section heading', (_name, Template) => {
    const props = buildMinimalTemplateProps()
    const html = renderToString(React.createElement(Template as React.ComponentType<ResumeTemplateProps>, props))
    // All templates use "Work Experience" heading text
    expect(html.toUpperCase()).toContain('EXPERIENCE')
  })
})
