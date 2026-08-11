import { useState } from 'react'
import { GoogleGenAI } from '@google/genai/web'
import { SAJU_BASIC_CHART_PROMPT, parseSajuResponse } from './prompts/sajuBasicChart'
import './App.css'

function App() {
  // name: 현재 입력된 이름 값
  // setName: 이름을 바꿀 때 사용하는 함수
  // useState('') : 처음에는 빈 문자열("")로 시작
  const [name, setName] = useState('')

  // 생년월일 (예: 1990-01-01)
  const [birthDate, setBirthDate] = useState('')

  // 태어난 시간 (예: 14:30)
  const [birthTime, setBirthTime] = useState('')

  // 성별 ('male' 또는 'female')
  const [gender, setGender] = useState('')

  // 양력/음력 ('solar' = 양력, 'lunar' = 음력)
  const [calendarType, setCalendarType] = useState('solar')

  // Gemini가 돌려준 사주 해석 결과
  const [result, setResult] = useState('')

  // 결과의 오행 테마 (fire / water / wood / metal / earth)
  const [theme, setTheme] = useState('default')

  // API 호출 중인지 여부 (버튼 중복 클릭 방지)
  const [isLoading, setIsLoading] = useState(false)

  // input에 글자를 입력할 때마다 실행되는 함수
  // event.target.value = 사용자가 방금 입력한 값
  const handleNameChange = (event) => {
    setName(event.target.value)
  }

  const handleBirthDateChange = (event) => {
    setBirthDate(event.target.value)
  }

  const handleBirthTimeChange = (event) => {
    setBirthTime(event.target.value)
  }

  const handleGenderChange = (event) => {
    setGender(event.target.value)
  }

  const handleCalendarTypeChange = (event) => {
    setCalendarType(event.target.value)
  }

  // 성별 값을 한글로 바꿔주는 작은 도우미 함수
  const getGenderLabel = () => {
    if (gender === 'male') return '남자'
    if (gender === 'female') return '여자'
    if (gender === '?') return '미선택/기타'
    return '미입력'
  }

  // 결과 버튼을 눌렀을 때 Gemini API를 호출합니다.
  const handleResultClick = async () => {
    // 필수 입력이 비어 있으면 API를 부르지 않습니다.
    if (!name || !birthDate || !birthTime || !gender) {
      setTheme('default')
      setResult('이름, 생년월일, 태어난 시간, 성별을 모두 입력해 주세요.')
      return
    }

    // .env 파일의 VITE_GEMINI_API_KEY 값을 읽어옵니다.
    const apiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()
    if (!apiKey) {
      setTheme('default')
      setResult('API 키가 없습니다. .env 파일에 VITE_GEMINI_API_KEY를 확인해 주세요.')
      return
    }
    if (/[^\x00-\x7F]/.test(apiKey)) {
      setTheme('default')
      setResult(
        'API 키에 영어/숫자 외 문자가 섞여 있습니다. AI Studio에서 키를 다시 복사해 .env에 붙여넣고 Vite를 재시작해 주세요.'
      )
      return
    }

    setIsLoading(true)
    setTheme('default')
    // 로딩 중에는 텍스트 대신 스켈레톤 UI를 보여줍니다.
    setResult('')

    try {
      // Gemini 클라이언트 만들기 (브라우저용 web SDK)
      const ai = new GoogleGenAI({ apiKey })

      // 사용자가 입력한 정보를 AI에게 보내는 본문
      const userInput = `
다음 사람의 사주를 기본 차트 기준으로 해석해 주세요.

이름: ${name}
성별: ${gender} (${getGenderLabel()})
생년월일: ${birthDate}
태어난 시간: ${birthTime}
달력: ${calendarType === 'solar' ? '양력' : '음력'}
`.trim()

      // generateContent 호출
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: userInput,
        config: {
          systemInstruction: SAJU_BASIC_CHART_PROMPT,
        },
      })

      // THEME 줄과 본문을 나눠서 저장합니다.
      const parsed = parseSajuResponse(response.text || '')
      setTheme(parsed.theme)
      setResult(parsed.body || '결과를 가져오지 못했습니다.')
    } catch (error) {
      console.error(error)
      setTheme('default')
      const message = error.message || String(error)
      if (message.includes('403') || message.includes('Permission') || message.includes('denied')) {
        setResult(
          'API 접근이 거부되었습니다(403). Google AI Studio에서 Gemini API 키를 새로 발급해 .env의 VITE_GEMINI_API_KEY를 교체한 뒤, Vite를 재시작해 주세요. https://aistudio.google.com/apikey'
        )
      } else {
        setResult(`오류가 발생했습니다: ${message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // theme 값에 따라 배경 색이 바뀝니다. 예: theme-fire, theme-water
    <div className={`page theme-${theme}`}>
      <div className="app">
        <h1>사주미</h1>
        <p className="lead">사주 정보를 입력해 주세요.</p>

        <div className="field">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="예: 홍길동"
          />
        </div>

        <div className="field">
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={handleBirthDateChange}
          />
        </div>

        <div className="field">
          <label htmlFor="birthTime">태어난 시간</label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={handleBirthTimeChange}
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
                checked={gender === 'male'}
                onChange={handleGenderChange}
              />
              남자
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={handleGenderChange}
              />
              여자
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="?"
                checked={gender === '?'}
                onChange={handleGenderChange}
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
                checked={calendarType === 'solar'}
                onChange={handleCalendarTypeChange}
              />
              양력
            </label>
            <label>
              <input
                type="radio"
                name="calendarType"
                value="lunar"
                checked={calendarType === 'lunar'}
                onChange={handleCalendarTypeChange}
              />
              음력
            </label>
          </div>
        </div>

        <button
          type="button"
          className="result-button"
          onClick={handleResultClick}
          disabled={isLoading}
        >
          {isLoading ? '해석 중...' : '결과 보기'}
        </button>

        {/* 로딩 중: 스켈레톤 UI / 완료 후: 실제 결과 */}
        {isLoading && (
          <div className="result" aria-busy="true" aria-label="사주 해석 로딩 중">
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
        )}

        {!isLoading && result && (
          <div className="result">
            <h2>사주 결과</h2>
            <p className="result-text">{result}</p>
          </div>
        )}

        <div className="preview">
          <p>현재 입력된 이름: {name}</p>
          <p>생년월일: {birthDate}</p>
          <p>태어난 시간: {birthTime}</p>
          <p>성별: {gender === 'male' ? '남자' : gender === 'female' ? '여자' : gender === '?' ? '?' : ''}</p>
          <p>달력: {calendarType === 'solar' ? '양력' : '음력'}</p>
        </div>
      </div>
    </div>
  )
}

export default App
