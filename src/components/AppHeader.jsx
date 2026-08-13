import Mascot from './Mascot'

export default function AppHeader({
  user,
  isAuthLoading,
  onOpenProfile,
  onLogout,
  onOpenLogin,
}) {
  return (
    <div className="app-header">
      <div className="app-title-row">
        <Mascot size="sm" className="mascot-bob" />
        <div>
          <h1>사주미</h1>
          <p className="lead">
            {user ? '정보를 알려주면 사주를 봐줄게-멍.' : '로그인 없이 먼저 테스트해 보라-멍.'}
          </p>
        </div>
      </div>
      <div className="user-chip">
        {user ? (
          <>
            <span className="user-email">{user.email}</span>
            <button type="button" className="ghost-button" onClick={onOpenProfile}>
              내 정보 수정
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={onLogout}
              disabled={isAuthLoading}
            >
              로그아웃
            </button>
          </>
        ) : (
          <button type="button" className="ghost-button" onClick={onOpenLogin}>
            로그인
          </button>
        )}
      </div>
    </div>
  )
}
