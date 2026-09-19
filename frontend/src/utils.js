const OWNER_TOKENS_KEY = 'dearlove.ownerTokens.v1'

export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)}m`
  return `${(m / 1000).toFixed(1)}km`
}

export function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateTime(iso) {
  const d = new Date(iso)
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function loadOwnerTokens() {
  try {
    return JSON.parse(localStorage.getItem(OWNER_TOKENS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveOwnerToken(id, token) {
  try {
    const map = loadOwnerTokens()
    map[id] = token
    localStorage.setItem(OWNER_TOKENS_KEY, JSON.stringify(map))
  } catch {
    /* best-effort only */
  }
}

export function myOwnerTokenFor(id) {
  return loadOwnerTokens()[id] || null
}
