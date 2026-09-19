import { useCallback, useEffect, useRef, useState } from 'react'
import { useGeolocation } from './hooks/useGeolocation.js'
import { useAuth } from './hooks/useAuth.js'
import { listLetters, createLetter, reverseGeocode, getProfile } from './api.js'
import { saveOwnerToken, myOwnerTokenFor } from './utils.js'
import LandingPage from './components/LandingPage.jsx'
import MapView from './components/MapView.jsx'
import LetterPanel from './components/LetterPanel.jsx'
import WriteModal from './components/WriteModal.jsx'
import ReadModal from './components/ReadModal.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import Toast from './components/Toast.jsx'

const POLL_INTERVAL_MS = 6000

export default function App() {
  const { me, status: geoStatus } = useGeolocation()
  const { auth, doLogin, doSignup, logout, clearInvalidSession } = useAuth()
  const [entered, setEntered] = useState(() => Boolean(auth))
  const [letters, setLetters] = useState([])
  const [profile, setProfile] = useState(null)
  const [writeOpen, setWriteOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
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
      const data = await listLetters(me.lat, me.lng, auth?.token)
      setLetters(data)
    } catch {
      showToast('편지 목록을 불러오지 못했어요.')
    }
  }, [me, auth, showToast])

  useEffect(() => {
    if (entered) refreshLetters()
  }, [entered, refreshLetters])

  useEffect(() => {
    if (!entered) return
    const id = setInterval(refreshLetters, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [entered, refreshLetters])

  useEffect(() => {
    if (entered && auth) {
      getProfile(auth.token).then(setProfile).catch(() => {})
    } else {
      setProfile(null)
    }
  }, [entered, auth])

  async function handleLogin(username, password) {
    await doLogin(username, password)
    setEntered(true)
    showToast(`다시 오셨네요, ${username}님 💌`)
  }

  async function handleSignup(username, password) {
    await doSignup(username, password)
    setEntered(true)
    showToast(`가입을 환영해요, ${username}님! 첫 편지를 남겨보세요.`)
  }

  function handleGuest() {
    setEntered(true)
  }

  function handleLogout() {
    logout()
    setEntered(false)
    showToast('로그아웃했어요.')
  }

  function openWrite() {
    if (!auth) {
      showToast('편지를 쓰려면 먼저 로그인해주세요.')
      setEntered(false)
      return
    }
    setWriteOpen(true)
  }

  async function handleSeal({ title, body, radius, recipientUsername }) {
    if (!me || !auth) return
    try {
      const placeLabel = await reverseGeocode(me.lat, me.lng)
      const { id, ownerToken } = await createLetter(
        { title, body, lat: me.lat, lng: me.lng, radius, placeLabel, recipientUsername },
        auth.token
      )
      saveOwnerToken(id, ownerToken)
      await refreshLetters()
      setWriteOpen(false)
      showToast(
        recipientUsername
          ? `❤️ ${recipientUsername}님에게만 보이는 편지를 이 자리에 남겼어요.`
          : '💌 편지를 이 자리에 봉인했어요. 이제 다른 사람도 같은 장소에서 열어볼 수 있어요.'
      )
    } catch (err) {
      if (err.message?.includes('로그인')) {
        clearInvalidSession()
        setEntered(false)
      }
      showToast(err.message || '편지를 봉인하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  if (!entered) {
    return <LandingPage onLogin={handleLogin} onSignup={handleSignup} onGuest={handleGuest} />
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
        <div className="auth-status">
          {auth ? (
            <>
              <button className="btn btn-ghost" onClick={() => setProfileOpen(true)}>
                {profile?.partnerUsername ? '❤️ ' : ''}
                <strong>{auth.username}</strong>님
              </button>
              <button className="btn btn-ghost" onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setEntered(false)}>로그인</button>
          )}
          <button className="btn btn-primary" onClick={openWrite}>
            <span className="icon">✍️</span> 편지 쓰기
          </button>
        </div>
      </header>

      <main className="layout">
        <MapView me={me} letters={letters} onLetterClick={setReadLetterId} />
        <LetterPanel letters={letters} geoStatus={geoStatus} auth={auth} onLetterClick={setReadLetterId} />
      </main>

      {writeOpen && (
        <WriteModal
          me={me}
          geoErrored={geoStatus.kind === 'err'}
          partnerUsername={profile?.partnerUsername || null}
          onClose={() => setWriteOpen(false)}
          onSeal={handleSeal}
          showToast={showToast}
        />
      )}

      {readLetterId && me && (
        <ReadModal
          letterId={readLetterId}
          me={me}
          auth={auth}
          myOwnerToken={myOwnerTokenFor(readLetterId)}
          onClose={() => setReadLetterId(null)}
          onDeleted={refreshLetters}
          showToast={showToast}
        />
      )}

      {profileOpen && auth && (
        <ProfileModal
          auth={auth}
          profile={profile}
          onProfileUpdated={setProfile}
          onClose={() => setProfileOpen(false)}
          showToast={showToast}
        />
      )}

      <Toast message={toast} />
    </div>
  )
}
