import { genderLabel, calendarLabel, formatBirthTime } from '../lib/labels'
import Mascot from './Mascot'

export default function ResultSection({
  isLoading,
  selectedReading,
  form,
  result,
  previewResult,
  isPreviewLocked,
  shareMessage,
  onResultChange,
  onShare,
  onUnlock,
}) {
  if (isLoading) {
    return (
      <div className="result" aria-busy="true" aria-label="사주 해석 로딩 중">
        <div className="loading-mascot">
          <Mascot size="md" className="mascot-bob" />
          <p className="result-hint">사주를 살피는 중이다-멍...</p>
        </div>
        <div className="skeleton skeleton-title" />
        <div className="skeleton-lines">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line medium" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      </div>
    )
  }

  if (selectedReading) {
    return (
      <div className="result">
        <div className="result-heading">
          <Mascot size="xs" />
          <h2>저장된 사주</h2>
        </div>
        <dl className="reading-meta">
          <div>
            <dt>이름</dt>
            <dd>{form.name}</dd>
          </div>
          <div>
            <dt>생년월일</dt>
            <dd>{form.birthDate}</dd>
          </div>
          <div>
            <dt>태어난 시간</dt>
            <dd>{formatBirthTime(form.birthTime)}</dd>
          </div>
          <div>
            <dt>성별</dt>
            <dd>{genderLabel(form.gender)}</dd>
          </div>
          <div>
            <dt>달력</dt>
            <dd>{calendarLabel(form.calendarType)}</dd>
          </div>
        </dl>
        <h3 className="result-subtitle">사주 결과</h3>
        <textarea
          className="result-editor"
          value={result}
          onChange={(event) => onResultChange(event.target.value)}
          rows={12}
          aria-label="사주 결과 수정"
        />
        <div className="result-actions">
          <button type="button" className="secondary-button" onClick={onShare}>
            공유하기
          </button>
        </div>
        {shareMessage && <p className="result-hint">{shareMessage}</p>}
        <p className="result-hint">내용을 고친 뒤 「수정 저장」을 누르면 반영된다-멍.</p>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="result">
      <div className="result-heading">
        <Mascot size="xs" />
        <h2>{isPreviewLocked ? '미리보기 결과' : '사주 결과'}</h2>
      </div>

      {isPreviewLocked ? (
        <>
          <p className="result-text">{previewResult}</p>
          <div className="locked-result">
            <div className="locked-result-blur" aria-hidden="true">
              <p>
                나머지 해석은 아직 잠겨 있다-멍. 재능의 흐름, 조심할 점, 특이 기운까지 이어서
                풀어줄 준비가 돼 있다-멍. 로그인하면 전체 결과가 열린다-멍.
              </p>
              <p>
                숨겨진 파트에는 약점 보완법과 기운의 리듬, 하루를 설계하는 팁이 들어 있다-멍.
              </p>
            </div>
            <div className="locked-result-cta">
              <Mascot size="sm" className="mascot-bob" />
              <p>전체 결과를 보려면 로그인해 달라-멍.</p>
              <button type="button" className="result-button" onClick={onUnlock}>
                Google로 전체 결과 보기
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="result-text">{result}</p>
          <div className="result-actions">
            <button type="button" className="secondary-button" onClick={onShare}>
              공유하기
            </button>
          </div>
          {shareMessage && <p className="result-hint">{shareMessage}</p>}
        </>
      )}
    </div>
  )
}
