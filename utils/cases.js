/**
 * Case study storage — localStorage now, MySQL API later.
 * To migrate: replace the four functions below with API calls.
 * The rest of the app is storage-agnostic.
 */

const STORAGE_KEY = 'va_case_studies'

function generateId () {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function persistCases (cases) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases))
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      // Storage full — drop the oldest half and retry once
      const trimmed = cases.slice(0, Math.max(1, Math.floor(cases.length / 2)))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      } catch (e2) {
        throw new Error('Storage quota exceeded. Please delete some saved cases to free up space.')
      }
    } else {
      throw e
    }
  }
}

export function getCases () {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch (e) {
    return []
  }
}

export function saveCase (caseData) {
  const cases = getCases()
  const entry = {
    ...caseData,
    id: generateId(),
    createdAt: new Date().toISOString()
  }
  cases.unshift(entry)
  persistCases(cases)
  return entry
}

export function updateCaseReview (id, review) {
  const cases = getCases().map(c => c.id === id ? { ...c, review } : c)
  persistCases(cases)
}

export function deleteCase (id) {
  const cases = getCases().filter(c => c.id !== id)
  persistCases(cases)
}

/**
 * Returns cases relevant to the current session:
 * - Advisor's own cases (any visibility)
 * - Shared cases from the same firm
 * Filtered to the same mode, most recent first, capped at limit.
 */
export function getRelevantCases (advisorId, firmId, mode, limit = 4) {
  return getCases()
    .filter(c => {
      if (c.mode !== mode) return false
      const isOwn = c.advisorId === advisorId
      const isFirmShared = c.firmId === firmId && c.visibility === 'shared'
      return isOwn || isFirmShared
    })
    .slice(0, limit)
}
