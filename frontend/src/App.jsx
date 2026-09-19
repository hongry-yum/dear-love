import { useCallback, useEffect, useRef, useState } from 'react'
import { useGeolocation } from './hooks/useGeolocation.js'
import { listLetters, createLetter, reverseGeocode } from './api.js'
import { saveOwnerToken } from './utils.js'
import MapView from './components/MapView.jsx'
import LetterPanel from './components/LetterPanel.jsx'
import WriteModal from './components/WriteModal.jsx'
import ReadModal from './components/ReadModal.jsx'
import Toast from './components/Toast.jsx'

const POLL_INTERVAL_MS = 6000

export default function App() {
  const { me, status: geoStatus } = useGeolocation()
  const [letters, setLetters] = useState([])
  const [writeOpen, setWriteOpen] = useState(false)
  const [readLetterId, setReadLetterId] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(''), 3200)
  }, [])

  const refreshLetters = useCallback(async () => {
    if (!me) return
    try {
      const data = await listLetters(me.lat, me.lng)
      setLetters(data)
    } catch {
      showToast('편지 목록을 불러오지 못했어요.')
    }
  }, [me, showToast])

  useEffect(() => {
    refreshLetters()
  }, [refreshLetters])

  useEffect(() => {
    const id = setInterval(refreshLetters, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refreshLetters])

  async function handleSeal({ title, body, radius }) {
    if (!me) return
    try {
      const placeLabel = await reverseGeocode(me.lat, me.lng)
      const { id, ownerToken } = await createLetter({
        title,
        body,
        lat: me.lat,
        lng: me.lng,
        radius,
        placeLabel,
      })
      saveOwnerToken(id, ownerToken)
      await refreshLetters()
      setWriteOpen(false)
      showToast('💌 편지를 이 자리에 봉인했어요. 이제 다른 사람도 같은 장소에서 열어볼 수 있어요.')
    } catch {
      showToast('편지를 봉인하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div id="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">💌</span>
          <div>
            <h1>Dear Love</h1>
            <p className="tagline">이 자리에 두고 간 마음은, 같은 곳에서만 다시 열립니다.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setWriteOpen(true)}>
          <span className="icon">✍️</span> 편지 쓰기
        </button>
      </header>

      <main className="layout">
        <MapView me={me} letters={letters} onLetterClick={setReadLetterId} />
        <LetterPanel letters={letters} geoStatus={geoStatus} onLetterClick={setReadLetterId} />
      </main>

      {writeOpen && (
        <WriteModal
          me={me}
          geoErrored={geoStatus.kind === 'err'}
          onClose={() => setWriteOpen(false)}
          onSeal={handleSeal}
          showToast={showToast}
        />
      )}

      {readLetterId && me && (
        <ReadModal
          letterId={readLetterId}
          me={me}
          onClose={() => setReadLetterId(null)}
          onDeleted={refreshLetters}
          showToast={showToast}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
