const PENDING_RESULT_KEY = 'saju_pending_result'

export function readPendingResult() {
  try {
    const raw = sessionStorage.getItem(PENDING_RESULT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function writePendingResult(payload) {
  sessionStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(payload))
}

export function clearPendingResult() {
  sessionStorage.removeItem(PENDING_RESULT_KEY)
}
