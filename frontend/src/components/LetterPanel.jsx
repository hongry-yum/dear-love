import { formatDate, formatDistance } from '../utils.js'

export default function LetterPanel({ letters, geoStatus, onLetterClick }) {
  const sorted = [...letters].sort((a, b) => a.distance - b.distance)

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>내가 남긴 편지</h2>
        <span className="count">{letters.length}통</span>
      </div>
      <div className={`panel-status ${geoStatus.kind === 'ok' ? 'ok' : geoStatus.kind === 'err' ? 'err' : ''}`}>
        {geoStatus.text}
      </div>

      {sorted.length === 0 ? (
        <p className="empty-hint">
          아직 남긴 편지가 없어요.
          <br />
          오른쪽 위 "편지 쓰기" 버튼을 눌러
          <br />
          지금 이 장소에 첫 편지를 남겨보세요.
        </p>
      ) : (
        <ul className="letter-list">
          {sorted.map((letter) => (
            <li key={letter.id} className="letter-card" onClick={() => onLetterClick(letter.id)}>
              <span className="status-icon">{letter.unlocked ? '🔓' : '🔒'}</span>
              <div className="info">
                <p className="title">{letter.title || '제목 없는 편지'}</p>
                <p className="meta">
                  {formatDate(letter.createdAt)} · {letter.placeLabel || '알 수 없는 장소'}
                </p>
                <span className={`dist-badge ${letter.unlocked ? 'unlocked' : 'locked'}`}>
                  {letter.unlocked ? '지금 열 수 있어요' : `${formatDistance(letter.distance)} 떨어짐`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
