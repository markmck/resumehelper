/**
 * Shared ResumeJson contract — strict export-validation schema.
 * Importable by both main process (import + future export) and renderer.
 *
 * NOTE: src/main/lib/aiProvider.ts::ResumeJsonSchema is a SEPARATE, permissive
 * LLM-extraction schema. Consolidation deferred per Phase 30 D-19.
 */
import { z } from 'zod'

export const ResumeJsonSchema = z.object({
  basics: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    summary: z.string().optional(),
    location: z.object({
      city: z.string().optional(),
    }).optional(),
    profiles: z.array(z.object({
      url: z.string().optional(),
    })).optional(),
  }).optional(),
  work: z.array(z.object({
    name: z.string().optional(),
    position: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
  skills: z.array(z.object({
    name: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })).optional(),
  projects: z.array(z.object({
    name: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
  education: z.array(z.object({
    institution: z.string().optional(),
    area: z.string().optional(),
    studyType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    score: z.string().optional(),
    courses: z.array(z.string()).optional(),
  })).optional(),
  volunteer: z.array(z.object({
    organization: z.string().optional(),
    position: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })).optional(),
  awards: z.array(z.object({
    title: z.string().optional(),
    date: z.string().optional(),
    awarder: z.string().optional(),
    summary: z.string().optional(),
  })).optional(),
  publications: z.array(z.object({
    name: z.string().optional(),
    publisher: z.string().optional(),
    releaseDate: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
  })).optional(),
  languages: z.array(z.object({
    language: z.string().optional(),
    fluency: z.string().optional(),
  })).optional(),
  interests: z.array(z.object({
    name: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })).optional(),
  references: z.array(z.object({
    name: z.string().optional(),
    reference: z.string().optional(),
  })).optional(),
})

export interface ResumeJson {
  basics?: {
    name?: string
    email?: string
    phone?: string
    summary?: string
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
