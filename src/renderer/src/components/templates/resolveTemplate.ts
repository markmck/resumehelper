import React from 'react'
import ClassicTemplate from './ClassicTemplate'
import { ResumeTemplateProps } from './types'

const TEMPLATE_MAP: Record<string, React.ComponentType<ResumeTemplateProps>> = {
  classic: ClassicTemplate,
}

export function resolveTemplate(key: string): React.ComponentType<ResumeTemplateProps> {
  return TEMPLATE_MAP[key] ?? ClassicTemplate
}

export const TEMPLATE_LIST: Array<{ key: string; displayName: string }> = Object.keys(
  TEMPLATE_MAP,
).map((key) => ({
  key,
  displayName: key.charAt(0).toUpperCase() + key.slice(1),
}))
