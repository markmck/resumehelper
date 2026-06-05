// NOTE: This module intentionally does NOT call fs.realpathSync or resolve symlinks.
// The user picked the path explicitly via the folder picker; the literal segments are what
// they intend. Resolving symlinks could surface paths the user never saw (e.g., OneDrive
// Known Folder Move redirects Documents to OneDrive without showing "OneDrive" in the picker).
// D-17 says: stay literal, warn-but-allow, explicit allowlist only.

export interface CloudPathMatch { match: true; reason: string }
export interface CloudPathClear { match: false }
export type CloudPathResult = CloudPathMatch | CloudPathClear

/**
 * Detect whether a path points to a well-known cloud-synced or network location (D-17).
 *
 * Returns { match: true, reason } if a cloud/UNC pattern is detected, or { match: false }
 * for normal local paths. This is advisory only — the app warns but does not block.
 */
export function detectCloudPath(p: string): CloudPathResult {
  // UNC prefix — Windows network share (\\server\share or //server/share)
  if (p.startsWith('\\\\') || p.startsWith('//')) {
    return { match: true, reason: 'Network share (UNC path)' }
  }

  // Split on either path separator; filter empty segments (e.g. from leading slash)
  const segments = p.split(/[\\/]+/).filter(Boolean)

  for (const seg of segments) {
    // OneDrive — exact segment name ("OneDrive") or tenant variants ("OneDrive - Slalom",
    // "OneDrive - Personal"). startsWith('OneDrive') alone is too broad and would flag
    // unrelated folders like "OneDriveBackups" (WR-06).
    if (seg === 'OneDrive' || seg.startsWith('OneDrive - ')) {
      return { match: true, reason: 'OneDrive folder' }
    }

    // Dropbox
    if (seg === 'Dropbox') {
      return { match: true, reason: 'Dropbox folder' }
    }

    // iCloud Drive (macOS folder name) and Mobile Documents com~apple~CloudDocs
    if (seg === 'iCloud Drive') {
      return { match: true, reason: 'iCloud Drive folder' }
    }
    if (seg === 'com~apple~CloudDocs') {
      return { match: true, reason: 'iCloud Drive (Mobile Documents)' }
    }

    // Google Drive — exact segment name ("Google Drive") or account variants
    // ("Google Drive (Mark)"). startsWith('Google Drive') alone would flag folders like
    // "Google Drive Exports" (WR-06).
    if (seg === 'Google Drive' || seg.startsWith('Google Drive (')) {
      return { match: true, reason: 'Google Drive folder' }
    }

    // Box and Box Sync
    if (seg === 'Box' || seg === 'Box Sync') {
      return { match: true, reason: 'Box folder' }
    }
  }

  return { match: false }
}
