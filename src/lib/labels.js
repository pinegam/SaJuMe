export function genderLabel(gender) {
  if (gender === 'male') return '남자'
  if (gender === 'female') return '여자'
  if (gender === '?') return '?'
  return '미입력'
}

export function calendarLabel(calendarType) {
  return calendarType === 'lunar' ? '음력' : '양력'
}

export function formatBirthTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

export function isProfileComplete(row) {
  return Boolean(row?.name && row?.birth_date && row?.birth_time && row?.gender)
}

export function getPreviewResult(text) {
  const value = String(text || '').trim()
  if (!value) return ''

  const paragraphs = value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (paragraphs.length >= 2) {
    return paragraphs[0]
  }

  const limit = Math.min(140, Math.max(80, Math.floor(value.length * 0.32)))
  if (value.length <= limit) return value
  return `${value.slice(0, limit).trim()}…`
}
