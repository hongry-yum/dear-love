import { useEffect, useState } from 'react'

export function useGeolocation() {
  const [me, setMe] = useState(null)
  const [status, setStatus] = useState({ text: '위치 확인 중…', kind: 'neutral' })

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setStatus({ text: '이 브라우저는 위치 정보를 지원하지 않아요.', kind: 'err' })
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setMe({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setStatus({ text: `현재 위치 확인됨 (오차 약 ${Math.round(pos.coords.accuracy)}m)`, kind: 'ok' })
      },
      () => {
        setStatus({ text: '위치 권한을 허용해야 편지를 쓰고 열 수 있어요.', kind: 'err' })
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return { me, status }
}
