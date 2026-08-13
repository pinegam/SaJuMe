import Mascot from './Mascot'

export default function SignupModal({
  isSignup,
  form,
  error,
  isSaving,
  isAuthLoading,
  onChange,
  onSubmit,
  onLogout,
  onCancel,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="signup-title">
        <div className="modal-mascot-row">
          <Mascot size="md" className="mascot-bob" />
          <div>
            <p className="modal-brand">사주미</p>
            <h2 id="signup-title" className="modal-title">
              {isSignup ? '회원가입' : '내 정보 수정'}
            </h2>
          </div>
        </div>
        <p className="modal-lead">
          {isSignup
            ? '처음 만났다-멍. 사주 해석에 필요한 기본 정보를 알려달라-멍.'
            : '저장된 기본 정보를 고칠 수 있다-멍.'}
        </p>
        <form className="modal-form" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="signup-name">이름</label>
            <input
              id="signup-name"
              type="text"
              value={form.name}
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="예: 홍길동"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <label htmlFor="signup-birthDate">생년월일</label>
            <input
              id="signup-birthDate"
              type="date"
              value={form.birthDate}
              onChange={(event) => onChange('birthDate', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="signup-birthTime">태어난 시간</label>
            <input
              id="signup-birthTime"
              type="time"
              value={form.birthTime}
              onChange={(event) => onChange('birthTime', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <span className="label-text">성별</span>
            <div className="options">
              <label>
                <input
                  type="radio"
                  name="signup-gender"
                  value="male"
                  checked={form.gender === 'male'}
                  onChange={(event) => onChange('gender', event.target.value)}
                  required
                />
                남자
              </label>
              <label>
                <input
                  type="radio"
                  name="signup-gender"
                  value="female"
                  checked={form.gender === 'female'}
                  onChange={(event) => onChange('gender', event.target.value)}
                />
                여자
              </label>
              <label>
                <input
                  type="radio"
                  name="signup-gender"
                  value="?"
                  checked={form.gender === '?'}
                  onChange={(event) => onChange('gender', event.target.value)}
                />
                ?
              </label>
            </div>
          </div>

          <div className="field">
            <span className="label-text">양력 / 음력</span>
            <div className="options">
              <label>
                <input
                  type="radio"
                  name="signup-calendarType"
                  value="solar"
                  checked={form.calendarType === 'solar'}
                  onChange={(event) => onChange('calendarType', event.target.value)}
                />
                양력
              </label>
              <label>
                <input
                  type="radio"
                  name="signup-calendarType"
                  value="lunar"
                  checked={form.calendarType === 'lunar'}
                  onChange={(event) => onChange('calendarType', event.target.value)}
                />
                음력
              </label>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="result-button" disabled={isSaving}>
            {isSaving ? '저장 중이다-멍...' : isSignup ? '가입 완료' : '저장'}
          </button>
          {isSignup ? (
            <button
              type="button"
              className="ghost-button modal-logout"
              onClick={onLogout}
              disabled={isAuthLoading || isSaving}
            >
              다른 계정으로 로그인
            </button>
          ) : (
            <button
              type="button"
              className="ghost-button modal-logout"
              onClick={onCancel}
              disabled={isSaving}
            >
              취소
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
