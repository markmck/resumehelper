import { describe, it, expect } from 'vitest'
import { detectCloudPath } from '../../../../src/main/lib/cloudPathHeuristic'

describe('detectCloudPath', () => {
  describe('UNC paths (network shares)', () => {
    it('matches Windows UNC path with backslash prefix', () => {
      const result = detectCloudPath('\\\\nas01\\share\\rh')
      expect(result.match).toBe(true)
      if (result.match) expect(result.reason).toMatch(/UNC|network/i)
    })

    it('matches UNC path with forward-slash prefix', () => {
      const result = detectCloudPath('//server/share')
      expect(result.match).toBe(true)
    })
  })

  describe('OneDrive paths', () => {
    it('matches basic OneDrive segment', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\OneDrive\\Documents\\rh')
      expect(result.match).toBe(true)
      if (result.match) expect(result.reason).toMatch(/OneDrive/i)
    })

    it('matches OneDrive - Personal tenant variant', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\OneDrive - Personal\\rh')
      expect(result.match).toBe(true)
    })

    it('matches OneDrive - Slalom tenant variant', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\OneDrive - Slalom\\rh')
      expect(result.match).toBe(true)
    })
  })

  describe('Dropbox paths', () => {
    it('matches Dropbox segment', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\Documents\\Dropbox\\rh')
      expect(result.match).toBe(true)
      if (result.match) expect(result.reason).toMatch(/Dropbox/i)
    })
  })

  describe('iCloud paths', () => {
    it('matches iCloud Drive segment', () => {
      const result = detectCloudPath('/Users/Mark/iCloud Drive/rh')
      expect(result.match).toBe(true)
      if (result.match) expect(result.reason).toMatch(/iCloud/i)
    })

    it('matches com~apple~CloudDocs (Mobile Documents)', () => {
      const result = detectCloudPath('/Users/Mark/Library/Mobile Documents/com~apple~CloudDocs/rh')
      expect(result.match).toBe(true)
    })
  })

  describe('Google Drive paths', () => {
    it('matches Google Drive segment', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\Google Drive\\rh')
      expect(result.match).toBe(true)
      if (result.match) expect(result.reason).toMatch(/Google Drive/i)
    })

    it('matches Google Drive with sub-path', () => {
      const result = detectCloudPath('G:\\Google Drive\\My Drive\\rh')
      expect(result.match).toBe(true)
    })
  })

  describe('Box paths', () => {
    it('matches Box segment', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\Box\\rh')
      expect(result.match).toBe(true)
      if (result.match) expect(result.reason).toMatch(/Box/i)
    })

    it('matches Box Sync segment', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\Box Sync\\rh')
      expect(result.match).toBe(true)
    })
  })

  describe('normal local paths (D-17 clear)', () => {
    it('clears C:\\Users\\Mark\\Documents\\rh', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\Documents\\rh')
      expect(result.match).toBe(false)
    })

    it('clears AppData\\Roaming\\resumehelper', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\AppData\\Roaming\\resumehelper')
      expect(result.match).toBe(false)
    })

    it('clears a standard Linux home path', () => {
      const result = detectCloudPath('/home/mark/projects/rh')
      expect(result.match).toBe(false)
    })

    it('clears C:\\OneDriveBackups (segment is OneDriveBackups, not OneDrive or OneDrive - *)', () => {
      // WR-06: tightened heuristic — "OneDriveBackups" is not a cloud segment
      const result = detectCloudPath('C:\\OneDriveBackups\\data')
      expect(result.match).toBe(false)
    })

    it('clears a path with OneDrive only in the value, not segment', () => {
      const result = detectCloudPath('C:\\Users\\Mark\\Documents\\backup')
      expect(result.match).toBe(false)
    })

    it('clears Google Drive Exports (not a cloud segment)', () => {
      // WR-06: "Google Drive Exports" should not match
      const result = detectCloudPath('C:\\Users\\Mark\\Google Drive Exports\\data')
      expect(result.match).toBe(false)
    })
  })
})
