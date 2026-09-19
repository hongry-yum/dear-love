import { useEffect, useState } from 'react'
import { getLetter, deleteLetter } from '../api.js'
import { formatDate, formatDistance } from '../utils.js'

export default function ReadModal({ letterId, me, auth, myOwnerToken, onClose, onDeleted, showToast }) {
  const [letter, setLetter] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getLetter(letterId, me.lat, me.lng, auth?.token)
      .then((data) => !cancelled && setLetter(data))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [letterId, me, auth])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const canDelete =
    Boolean(myOwnerToken) || (auth && letter && letter.authorUsername === auth.username)

  async function handleDelete() {
    if (!confirm('이 편지를 삭제할까요? 되돌릴 수 없어요.')) return
    const ok = await deleteLetter(letterId, { token: auth?.token, ownerToken: myOwnerToken })
    if (ok) {
      onDeleted()
      onClose()
      showToast('편지를 삭제했어요.')
    } else {
      showToast('삭제하지 못했어요.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>
            {letter?.isPrivate && <span className="title-heart">❤️ </span>}
            {letter ? letter.title || '제목 없는 편지' : '불러오는 중…'}
          </h2>
          <button className="btn-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        {error && <div className="read-locked">편지를 불러오지 못했어요.</div>}

        {letter && letter.unlocked && (
          <>
            <div className="read-body-text">{letter.body}</div>
            <p className="read-meta">
              {formatDate(letter.createdAt)} ·{' '}
              {letter.authorUsername ? `${letter.authorUsername}님이 ` : ''}
              {letter.placeLabel || '이 장소'}에서 쓴 편지
              {letter.isPrivate ? ' (나에게만)' : ''}
            </p>
          </>
        )}

        {letter && !letter.unlocked && letter.lockReason === 'recipient' && (
          <div className="read-locked">
            <span className="big-icon">❤️</span>
            이 편지는 정해진 한 사람만 열어볼 수 있는 편지예요.
          </div>
        )}

        {letter && !letter.unlocked && letter.lockReason === 'distance' && (
          <div className="read-locked">
            <span className="big-icon">🔒</span>
            아직 이 편지를 열 수 없어요.
            <br />
            이 편지는 <strong>{letter.placeLabel || '다른 장소'}</strong>에서 봉인되었어요.
            <br />
            현재 위치에서 <span className="dist">{formatDistance(letter.distance)}</span> 더 가까이 가야
            (허용 반경 {formatDistance(letter.radius)} 이내) 열 수 있어요.
          </div>
        )}

        <div className="modal-actions">
          {canDelete && (
            <button className="btn btn-ghost" onClick={handleDelete}>🗑 삭제</button>
          )}
          <button className="btn btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
