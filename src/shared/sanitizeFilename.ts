/**
 * Sanitize a string for use as a filename component.
 * Spaces → underscores; everything outside [a-zA-Z0-9_-] removed.
 *
 * Lifted verbatim from VariantEditor.tsx (v2.1) so PDF/DOCX/JSON exports
 * produce identical filenames for the same profile name.
 */
export function sanitizeFilename(s: string): string {
  return s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
}
