import Mascot from './Mascot'

export default function LoginModal({ authError, isAuthLoading, onLogin, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="modal-mascot-row">
          <Mascot size="md" className="mascot-bob" />
          <div>
            <p className="modal-brand">사주미</p>
            <h2 id="login-title" className="modal-title">
              전체 결과 잠금 해제
            </h2>
          </div>
        </div>
        <p className="modal-lead">
          미리보기만 보여줬다-멍. Google로 로그인하면 전체 해석과 저장이 열린다-멍.
        </p>
        {authError && <p className="auth-error">{authError}</p>}
        <button
          type="button"
          className="google-button"
          onClick={onLogin}
          disabled={isAuthLoading}
        >
          {isAuthLoading ? '이동 중이다-멍...' : 'Google로 계속하기'}
        </button>
        <button
          type="button"
          className="ghost-button modal-logout"
          onClick={onClose}
          disabled={isAuthLoading}
        >
          나중에 하기
        </button>
      </div>
    </div>
  )
}
