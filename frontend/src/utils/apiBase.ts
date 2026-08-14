export function normalizeApiUrl(rawValue?: string) {
  if (!rawValue) return ''

  const trimmedValue = rawValue.trim().replace(/\/$/, '')
  return trimmedValue.endsWith('/api') ? trimmedValue.slice(0, -4) : trimmedValue
}

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL)