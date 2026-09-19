const API_BASE = 'https://84mr6v30b7.execute-api.ap-northeast-2.amazonaws.com'

export async function listLetters(lat, lng) {
  const res = await fetch(`${API_BASE}/letters?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error('list failed')
  const data = await res.json()
  return data.letters
}

export async function getLetter(id, lat, lng) {
  const res = await fetch(`${API_BASE}/letters/${id}?lat=${lat}&lng=${lng}`)
  if (!res.ok) throw new Error('get failed')
  return res.json()
}

export async function createLetter(payload) {
  const res = await fetch(`${API_BASE}/letters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'create failed')
  }
  return res.json()
}

export async function deleteLetter(id, ownerToken) {
  const res = await fetch(`${API_BASE}/letters/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerToken }),
  })
  return res.ok
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('bad response')
    const data = await res.json()
    const a = data.address || {}
    const parts = [a.neighbourhood, a.suburb || a.village, a.city || a.town || a.county].filter(Boolean)
    return parts.length ? parts.join(' ') : data.display_name?.split(',').slice(0, 2).join(',') || ''
  } catch {
    return ''
  }
}
