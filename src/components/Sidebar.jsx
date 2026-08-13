import Mascot from './Mascot'

export default function Sidebar({
  user,
  readings,
  selectedId,
  listError,
  onResetForm,
  onSelectReading,
}) {
  return (
    <aside className="sidebar" aria-label="저장된 사주 목록">
      <div className="sidebar-header">
        <h2 className="sidebar-title">{user ? '저장된 사주' : '무료 테스트'}</h2>
        {user ? (
          <button type="button" className="ghost-button" onClick={onResetForm}>
            내 정보로
          </button>
        ) : null}
      </div>
      {listError && <p className="sidebar-error">{listError}</p>}
      {!user && (
        <div className="sidebar-empty-block">
          <Mascot size="sm" />
          <p className="sidebar-empty">
            먼저 사주를 테스트해 보라-멍. 전체 결과와 저장은 로그인 후 열린다-멍.
          </p>
        </div>
      )}
      {user && readings.length === 0 && !listError && (
        <div className="sidebar-empty-block">
          <Mascot size="sm" />
          <p className="sidebar-empty">아직 없다-멍. 결과 보기를 누르면 여기에 생긴다-멍.</p>
        </div>
      )}
      {user && (
        <div className="name-list">
          {readings.map((reading) => (
            <button
              key={reading.id}
              type="button"
              className={`name-button${selectedId === reading.id ? ' is-active' : ''}`}
              onClick={() => onSelectReading(reading)}
            >
              {reading.name}
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
