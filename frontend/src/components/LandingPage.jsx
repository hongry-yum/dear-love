import { useState } from 'react'

export default function LandingPage({ onLogin, onSignup, onGuest }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await onLogin(username.trim(), password)
      } else {
        await onSignup(username.trim(), password)
      }
    } catch (err) {
      setError(err.message || '알 수 없는 오류가 발생했어요.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  return (
    <div className="landing">
      <div className="landing-decor" aria-hidden="true">
        <span>💌</span>
        <span>🕊️</span>
        <span>💌</span>
        <span>🌙</span>
        <span>💌</span>
      </div>

      <div className="landing-content">
        <p className="landing-eyebrow">위치에 마음을 두고 가는 편지</p>
        <h1 className="landing-title">Dear Love</h1>
        <p className="landing-copy">
          그날, 그 자리에서만 다시 열리는 편지.
          <br />
          발길이 닿았던 곳에 마음을 묻어두면,
          <br />
          같은 자리로 돌아온 사람만 그 마음을 열어볼 수 있어요.
        </p>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              로그인
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="auth-username">아이디</label>
            <input
              id="auth-username"
              type="text"
              autoComplete="username"
              placeholder="영문 소문자/숫자/밑줄 3~20자"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
            />

            <label className="field-label" htmlFor="auth-password">비밀번호</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="4자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
              {busy ? '확인 중…' : mode === 'login' ? '로그인하고 편지 쓰러가기' : '가입하고 편지 쓰러가기'}
            </button>
          </form>
        </div>

        <button type="button" className="landing-guest" onClick={onGuest}>
          로그인 없이 둘러보기 →
        </button>
      </div>
    </div>
  )
}
