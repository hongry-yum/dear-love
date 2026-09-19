import { useEffect, useState } from 'react'

export default function WriteModal({ me, geoErrored, partnerUsername, onClose, onSeal, showToast }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [radius, setRadius] = useState('100')
  const [recipient, setRecipient] = useState('public') // 'public' | 'partner'
  const [sealing, setSealing] = useState(false)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleSeal() {
    if (!body.trim()) {
      showToast('편지 내용을 적어주세요.')
      return
    }
    setSealing(true)
    await onSeal({
      title: title.trim(),
      body: body.trim(),
      radius: Number(radius),
      recipientUsername: recipient === 'partner' ? partnerUsername : null,
    })
    setSealing(false)
  }

  const locationDesc = me
    ? `현재 위치(오차 약 ${Math.round(me.accuracy)}m)에 편지를 봉인해요. 선택한 반경 안에서만 다시 열 수 있어요.`
    : geoErrored
      ? '위치 권한이 필요해요. 브라우저 설정에서 위치 접근을 허용해주세요.'
      : '현재 위치를 확인하고 있어요…'

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>✍️ 편지 봉인하기</h2>
          <button className="btn-close" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <p className="modal-desc">{locationDesc}</p>

        <label className="field-label" htmlFor="letter-title-input">제목 (선택)</label>
        <input
          id="letter-title-input"
          type="text"
          maxLength={40}
          placeholder="예: 첫 데이트 했던 카페에서"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="field-label" htmlFor="letter-body-input">편지 내용</label>
        <textarea
          id="letter-body-input"
          maxLength={2000}
          rows={8}
          placeholder="지금 이 순간, 이 장소에서 전하고 싶은 이야기를 적어보세요…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div className="radius-row">
          <label htmlFor="radius-select">열람 허용 반경</label>
          <select id="radius-select" value={radius} onChange={(e) => setRadius(e.target.value)}>
            <option value="30">30m (아주 정확한 자리)</option>
            <option value="100">100m (같은 건물/장소)</option>
            <option value="300">300m (동네 어귀까지)</option>
            <option value="1000">1km (같은 동네)</option>
          </select>
        </div>

        <div className="radius-row">
          <label htmlFor="recipient-select">받는 사람</label>
          {partnerUsername ? (
            <select id="recipient-select" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="public">전체 공개 (같은 장소의 누구나)</option>
              <option value="partner">❤️ {partnerUsername}에게만</option>
            </select>
          ) : (
            <p className="modal-desc" style={{ margin: 0 }}>
              전체 공개로 남겨져요. 프로필에서 연인을 등록하면 그 사람에게만 보이는 편지를 쓸 수 있어요.
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>취소</button>
          <button className="btn btn-primary" disabled={!me || sealing} onClick={handleSeal}>
            {sealing ? '봉인 중…' : '🔒 이 자리에 편지 봉인하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
