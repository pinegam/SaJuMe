export default function SajuForm({
  form,
  onChange,
  onSubmit,
  onUpdate,
  onDelete,
  selectedId,
  user,
  busy,
  isLoading,
  isSaving,
  isDeleting,
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="name">이름</label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="예: 홍길동"
        />
      </div>

      <div className="field">
        <label htmlFor="birthDate">생년월일</label>
        <input
          id="birthDate"
          type="date"
          value={form.birthDate}
          onChange={(event) => onChange('birthDate', event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="birthTime">태어난 시간</label>
        <input
          id="birthTime"
          type="time"
          value={form.birthTime}
          onChange={(event) => onChange('birthTime', event.target.value)}
        />
      </div>

      <div className="field">
        <span className="label-text">성별</span>
        <div className="options">
          <label>
            <input
              type="radio"
              name="gender"
              value="male"
              checked={form.gender === 'male'}
              onChange={(event) => onChange('gender', event.target.value)}
            />
            남자
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="female"
              checked={form.gender === 'female'}
              onChange={(event) => onChange('gender', event.target.value)}
            />
            여자
          </label>
          <label>
            <input
              type="radio"
              name="gender"
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
              name="calendarType"
              value="solar"
              checked={form.calendarType === 'solar'}
              onChange={(event) => onChange('calendarType', event.target.value)}
            />
            양력
          </label>
          <label>
            <input
              type="radio"
              name="calendarType"
              value="lunar"
              checked={form.calendarType === 'lunar'}
              onChange={(event) => onChange('calendarType', event.target.value)}
            />
            음력
          </label>
        </div>
      </div>

      <div className="action-row">
        <button type="button" className="result-button" onClick={onSubmit} disabled={busy}>
          {isLoading ? '해석 중이다-멍...' : selectedId ? '새로 해석·저장' : '결과 보기'}
        </button>
        {selectedId && user && (
          <>
            <button type="button" className="secondary-button" onClick={onUpdate} disabled={busy}>
              {isSaving ? '저장 중이다-멍...' : '수정 저장'}
            </button>
            <button type="button" className="danger-button" onClick={onDelete} disabled={busy}>
              {isDeleting ? '삭제 중이다-멍...' : '삭제'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
