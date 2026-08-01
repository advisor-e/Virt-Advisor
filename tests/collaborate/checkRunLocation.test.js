'use strict'

/**
 * Tests for the run-location guard (scripts/check-run-location.js).
 * The pure detection function is tested directly — no process is started.
 */

const { detectSyncFolder } = require('../../scripts/collaborate/check-run-location')

describe('detectSyncFolder', () => {
  test('flags a Windows Dropbox path', () => {
    expect(detectSyncFolder('C:\\Users\\mb\\Dropbox\\MBC\\Colab')).toBe('Dropbox')
  })

  test('flags a forward-slash Dropbox path', () => {
    expect(detectSyncFolder('/c/Users/mb/Dropbox/Colab')).toBe('Dropbox')
  })

  test('flags a OneDrive path (including "OneDrive - Company")', () => {
    expect(detectSyncFolder('C:/Users/mb/OneDrive - Advisor-e/Projects/app')).toBe('OneDrive')
  })

  test('flags a Google Drive path', () => {
    expect(detectSyncFolder('/Users/mb/Google Drive/app')).toBe('Google Drive')
  })

  test('allows the canonical C: Projects path', () => {
    expect(detectSyncFolder('C:\\Users\\Mike Barnes\\Projects\\Advisor Collaborate')).toBeNull()
  })

  test('returns null for empty or missing input', () => {
    expect(detectSyncFolder('')).toBeNull()
    expect(detectSyncFolder(undefined)).toBeNull()
  })
})
