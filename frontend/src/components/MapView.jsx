import { useEffect, useRef } from 'react'
import L from 'leaflet'

function iconFor(emoji, extraClass = '') {
  return L.divIcon({
    className: '',
    html: `<div class="dl-marker ${extraClass}">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

export default function MapView({ me, letters, onLetterClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const centeredRef = useRef(false)
  const meMarkerRef = useRef(null)
  const meCircleRef = useRef(null)
  const markersRef = useRef(new Map())
  const onLetterClickRef = useRef(onLetterClick)
  onLetterClickRef.current = onLetterClick

  useEffect(() => {
    const map = L.map(containerRef.current, { zoomControl: true }).setView([37.5665, 126.978], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      meMarkerRef.current = null
      meCircleRef.current = null
      markersRef.current = new Map()
      centeredRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !me) return

    if (!centeredRef.current) {
      map.setView([me.lat, me.lng], 16)
      centeredRef.current = true
    }

    if (!meMarkerRef.current) {
      meMarkerRef.current = L.marker([me.lat, me.lng], { icon: iconFor('🧭', 'me'), zIndexOffset: 1000 }).addTo(map)
      meCircleRef.current = L.circle([me.lat, me.lng], {
        radius: me.accuracy || 0,
        color: '#c9536b',
        fillColor: '#c9536b',
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map)
    } else {
      meMarkerRef.current.setLatLng([me.lat, me.lng])
      meCircleRef.current.setLatLng([me.lat, me.lng])
      meCircleRef.current.setRadius(me.accuracy || 0)
    }
  }, [me])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const seen = new Set()
    for (const letter of letters) {
      seen.add(letter.id)
      const emoji = letter.unlocked ? '🔓' : '🔒'
      let marker = markersRef.current.get(letter.id)
      if (!marker) {
        marker = L.marker([letter.lat, letter.lng], { icon: iconFor(emoji) })
          .addTo(map)
          .on('click', () => onLetterClickRef.current(letter.id))
        markersRef.current.set(letter.id, marker)
      } else {
        marker.setIcon(iconFor(emoji))
      }
      marker.bindTooltip(letter.title || '제목 없는 편지', { direction: 'top', offset: [0, -14] })
    }
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        map.removeLayer(marker)
        markersRef.current.delete(id)
      }
    }
  }, [letters])

  return <div id="map" ref={containerRef} />
}
