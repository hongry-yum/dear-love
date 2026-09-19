import { useMemo, useState } from 'react'
import { formatDate, formatDistance } from '../utils.js'

export default function LetterPanel({ letters, geoStatus, auth, onLetterClick }) {
  const [tab, setTab] = useState('mine') // 'mine' | 'others'
  const [sort, setSort] = useState('distance') // 'distance' | 'recent'

  const showTabs = Boolean(auth)

  const filtered = useMemo(() => {
    if (!showTabs) return letters
    return letters.filter((letter) =>
      tab === 'mine' ? letter.authorUsername === auth.username : letter.authorUsername !== auth.username
    )
  }, [letters, showTabs, tab, auth])

  const sorted = useMemo(() => {
    const list = [...filtered]
    if (sort === 'recent') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } else {
      list.sort((a, b) => a.distance - b.distance)
    }
    return list
  }, [filtered, sort])

  const emptyHint = !showTabs
    ? (
      <>
        아직 남긴 편지가 없어요.
        <br />
        오른쪽 위 "편지 쓰기" 버튼을 눌러
        <br />
        지금 이 장소에 첫 편지를 남겨보세요.
      </>
    ) : tab === 'mine' ? (
      <>
        아직 남긴 편지가 없어요.
        <br />
        오른쪽 위 "편지 쓰기" 버튼을 눌러
        <br />
        지금 이 장소에 첫 편지를 남겨보세요.
      </>
    ) : (
      <>
        아직 발견한 편지가 없어요.
        <br />
        다른 사람이 남긴 편지가 있는 장소로
        <br />
        가까이 가보세요.
      </>
    )

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>편지 목록</h2>
        <span className="count">{sorted.length}통</span>
      </div>
      <div className={`panel-status ${geoStatus.kind === 'ok' ? 'ok' : geoStatus.kind === 'err' ? 'err' : ''}`}>
        {geoStatus.text}
      </div>

      {showTabs && (
        <div className="panel-tabs">
          <button
            type="button"
            className={`panel-tab ${tab === 'mine' ? 'active' : ''}`}
            onClick={() => setTab('mine')}
          >
            내가 남긴 편지
          </button>
          <button
            type="button"
            className={`panel-tab ${tab === 'others' ? 'active' : ''}`}
            onClick={() => setTab('others')}
          >
            나에게 남겨진 편지
          </button>
        </div>
      )}

      <div className="panel-sort">
        <button
          type="button"
          className={`sort-chip ${sort === 'distance' ? 'active' : ''}`}
          onClick={() => setSort('distance')}
        >
          가까운 순
        </button>
        <button
          type="button"
          className={`sort-chip ${sort === 'recent' ? 'active' : ''}`}
          onClick={() => setSort('recent')}
        >
          최신 순
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-hint">{emptyHint}</p>
      ) : (
        <ul className="letter-list">
          {sorted.map((letter) => (
            <li key={letter.id} className="letter-card" onClick={() => onLetterClick(letter.id)}>
              <span className="status-icon">{letter.isPrivate ? '❤️' : letter.unlocked ? '🔓' : '🔒'}</span>
              <div className="info">
                <p className="title">{letter.title || '제목 없는 편지'}</p>
                <p className="meta">
                  {formatDate(letter.createdAt)} · {letter.placeLabel || '알 수 없는 장소'}
                  {letter.isPrivate ? ' · 단둘이 보는 편지' : ''}
                </p>
                <span className={`dist-badge ${letter.unlocked ? 'unlocked' : 'locked'}`}>
                  {letter.unlocked
                    ? '지금 열 수 있어요'
                    : letter.lockReason === 'recipient'
                      ? '나에게 온 편지가 아니에요'
                      : `${formatDistance(letter.distance)} 떨어짐`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
