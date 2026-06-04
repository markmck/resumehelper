/** @vitest-environment jsdom */
import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import ImportConfirmModal from '@renderer/components/ImportConfirmModal'

const APPEND_ONLY_COPY =
  'Re-importing previously exported data creates duplicates — import is append-only.'

const baseProps = {
  counts: { jobs: 3, skills: 5 },
  hasProfile: true,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  loading: false,
}

describe('ImportConfirmModal append-only note', () => {
  test('does NOT render the append-only italic note in replace mode', () => {
    const html = renderToString(<ImportConfirmModal {...baseProps} mode="replace" />)
    expect(html).not.toContain(APPEND_ONLY_COPY)
  })

  test('renders the append-only italic note in append mode', () => {
    const html = renderToString(<ImportConfirmModal {...baseProps} mode="append" />)
    expect(html).toContain(APPEND_ONLY_COPY)
    expect(html).toContain('font-style:italic')
  })
})
