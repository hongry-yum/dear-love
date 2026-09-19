import { useEffect, useState } from 'react'
import * as api from '../api.js'

export default function ProfileModal({ auth, profile, onProfileUpdated, onClose, showToast }) {
  const [editing, setEditing] = useState(false)
  const [partnerUsername, setPartnerUsername] = useState('')
  const [startDate, setStartDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function startEditing() {
    setPartnerUsername(profile?.partnerUsername || '')
    setStartDate(profile?.relationshipStartDate || '')
    setError('')
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const updated = await api.setPartner(auth.token, { partnerUsername: partnerUsername.trim(), relationshipStartDate: startDate })
      onProfileUpdated(updated)
      setEditing(false)
      showToast('❤️ 연인을 등록했어요.')
    } catch (err) {
      setError(err.message || '등록에 실패했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!confirm('연인 등록을 해제할까요?')) return
    setBusy(true)
    try {
      const updated = await api.removePartner(auth.token)
      onProfileUpdated(updated)
      showToast('연인 등록을 해제했어요.')
    } catch {
      showToast('해제하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>내 프로필</h2>
          <button className="btn-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <p className="profile-username">
          아이디: <strong>{auth.username}</strong>
        </p>

        {!profile && <p className="modal-desc">불러오는 중…</p>}

        {profile && !editing && (
          <div className="partner-view">
            {profile.partnerUsername ? (
              <>
                <p className="partner-display">
                  <span className="partner-heart">❤️</span> {profile.partnerUsername}
                </p>
                {profile.daysTogether != null && (
                  <p className="partner-days">
                    우리가 만난 지 <strong>{profile.daysTogether}</strong>일째예요
                  </p>
                )}
                <div className="modal-actions">
                  <button className="btn btn-ghost" onClick={handleRemove} disabled={busy}>연인 해제</button>
                  <button className="btn btn-primary" onClick={startEditing} disabled={busy}>정보 수정</button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-desc">아직 등록된 연인이 없어요. 연인은 한 명만 등록할 수 있어요.</p>
                <button className="btn btn-primary" onClick={startEditing}>❤️ 연인 등록하기</button>
              </>
            )}
          </div>
        )}

        {profile && editing && (
          <form onSubmit={handleSave}>
            <label className="field-label" htmlFor="partner-username">연인의 아이디</label>
            <input
              id="partner-username"
              type="text"
              placeholder="상대방의 아이디"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value.toLowerCase())}
              required
            />

            <label className="field-label" htmlFor="relationship-start-date">연애 시작일</label>
            <input
              id="relationship-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
            />

            {error && <p className="auth-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)} disabled={busy}>취소</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? '저장 중…' : '❤️ 등록하기'}
              </button>
            </div>
          </form>
        )}

        {profile && !editing && (
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>닫기</button>
          </div>
        )}
      </div>
    </div>
  )
}
