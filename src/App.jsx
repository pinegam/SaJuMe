import { useEffect, useState } from 'react'
import { GoogleGenAI } from '@google/genai/web'
import { SAJU_BASIC_CHART_PROMPT, parseSajuResponse } from './prompts/sajuBasicChart'
import { supabase } from './lib/supabase'
import './App.css'

// 임시: Gemini 할당량 초과 시 true. 다시 API 쓰려면 false로 바꾸세요.
const USE_MOCK_SAJU = true

function genderLabel(gender) {
  if (gender === 'male') return '남자'
  if (gender === 'female') return '여자'
  if (gender === '?') return '?'
  return '미입력'
}

function calendarLabel(calendarType) {
  return calendarType === 'lunar' ? '음력' : '양력'
}

function formatBirthTime(time) {
  if (!time) return ''
  return String(time).slice(0, 5)
}

function buildMockSajuText({ name, birthDate, birthTime, gender, calendarType }) {
  const themes = ['fire', 'water', 'wood', 'metal', 'earth']
  const theme = themes[name.length % themes.length]

  return `THEME:${theme}
[임시 결과] ${name}님의 사주 해석입니다. 현재 Gemini API 이용량 한도로 인해 임시 문장으로 대체되었습니다.

생년월일 ${birthDate}, 태어난 시간 ${birthTime}, 성별 ${genderLabel(gender)}, ${calendarLabel(calendarType)} 기준으로 보면 전반적으로 균형 잡힌 기운이 느껴집니다. 겉으로는 차분하지만 속으로는 추진력이 강한 편이며, 한 번 마음먹은 일은 끝까지 밀어붙이는 기질이 돋보입니다.

재능 면에서는 사람과 상황을 빠르게 읽고 말로 풀어내는 능력이 눈에 띕니다. 다만 생각이 많아지면 결정을 미루는 경향이 있어, 중요한 순간에는 기준을 하나 정해 두는 편이 좋습니다.

약점은 완벽을 추구하기보다 속도에 치우칠 때 디테일을 놓치기 쉽다는 점입니다. 반대로 장점은 위기 상황에서도 분위기나 흐름을 바꾸는 힘이 있다는 점입니다.

특이하게도 ${birthTime} 시간대 기운이 성격의 리듬을 크게 좌우하는 편이라, 하루의 시작과 마무리를 스스로 설계할 때 컨디션이 안정됩니다.

이 결과는 임시 문구이며, API 한도가 회복되면 실제 Gemini 해석으로 교체할 수 있습니다.`
}

function App() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  const [result, setResult] = useState('')
  const [theme, setTheme] = useState('default')
  const [isLoading, setIsLoading] = useState(false)

  const [readings, setReadings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [listError, setListError] = useState('')

  const selectedReading = readings.find((item) => item.id === selectedId) || null

  useEffect(() => {
    let cancelled = false

    async function loadReadings() {
      const { data, error } = await supabase
        .from('saju_readings')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error(error)
        setListError('저장된 사주 목록을 불러오지 못했습니다. 테이블/RLS를 확인해 주세요.')
        return
      }

      setReadings(data || [])
      setListError('')
    }

    loadReadings()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectReading = (reading) => {
    setSelectedId(reading.id)
    setTheme(reading.theme || 'default')
    setResult(reading.result || '')
    setName(reading.name || '')
    setBirthDate(reading.birth_date || '')
    setBirthTime(formatBirthTime(reading.birth_time))
    setGender(reading.gender || '')
    setCalendarType(reading.calendar_type || 'solar')
  }

  const handleResultClick = async () => {
    if (!name || !birthDate || !birthTime || !gender) {
      setTheme('default')
      setSelectedId(null)
      setResult('이름, 생년월일, 태어난 시간, 성별을 모두 입력해 주세요.')
      return
    }

    const apiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()
    if (!USE_MOCK_SAJU) {
      if (!apiKey) {
        setTheme('default')
        setSelectedId(null)
        setResult('API 키가 없습니다. .env 파일에 VITE_GEMINI_API_KEY를 확인해 주세요.')
        return
      }
      if (/[^\x00-\x7F]/.test(apiKey)) {
        setTheme('default')
        setSelectedId(null)
        setResult(
          'API 키에 영어/숫자 외 문자가 섞여 있습니다. AI Studio에서 키를 다시 복사해 .env에 붙여넣고 Vite를 재시작해 주세요.',
        )
        return
      }
    }

    setIsLoading(true)
    setTheme('default')
    setResult('')
    setSelectedId(null)

    try {
      let rawText = ''

      if (USE_MOCK_SAJU) {
        await new Promise((resolve) => setTimeout(resolve, 600))
        rawText = buildMockSajuText({
          name,
          birthDate,
          birthTime,
          gender,
          calendarType,
        })
      } else {
        const ai = new GoogleGenAI({ apiKey })

        const userInput = `
다음 사람의 사주를 기본 차트 기준으로 해석해 주세요.

이름: ${name}
성별: ${gender} (${genderLabel(gender)})
생년월일: ${birthDate}
태어난 시간: ${birthTime}
달력: ${calendarLabel(calendarType)}
`.trim()

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: userInput,
          config: {
            systemInstruction: SAJU_BASIC_CHART_PROMPT,
          },
        })

        rawText = response.text || ''
      }

      const parsed = parseSajuResponse(rawText)
      const resultBody = parsed.body || '결과를 가져오지 못했습니다.'
      setTheme(parsed.theme)
      setResult(resultBody)

      const { data: saved, error: saveError } = await supabase
        .from('saju_readings')
        .insert({
          name,
          birth_date: birthDate,
          birth_time: birthTime,
          gender,
          calendar_type: calendarType,
          theme: parsed.theme,
          result: resultBody,
        })
        .select()
        .single()

      if (saveError) {
        console.error('Supabase save failed:', saveError)
        setListError('결과는 표시되지만 저장에 실패했습니다. schema.sql 실행 여부를 확인해 주세요.')
      } else if (saved) {
        setReadings((prev) => [saved, ...prev])
        setSelectedId(saved.id)
        setListError('')
      }
    } catch (error) {
      console.error(error)
      setTheme('default')
      setSelectedId(null)
      const message = error.message || String(error)
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
        setResult(
          'Gemini API 사용량 한도를 초과했습니다. 약 1분 뒤 다시 시도하거나, 내일(태평양 시간 기준) 한도가 초기화된 뒤 사용해 주세요. 사용량: https://ai.dev/rate-limit',
        )
      } else if (message.includes('403') || message.includes('Permission') || message.includes('denied')) {
        setResult(
          'API 접근이 거부되었습니다(403). Google AI Studio에서 Gemini API 키를 새로 발급해 .env의 VITE_GEMINI_API_KEY를 교체한 뒤, Vite를 재시작해 주세요. https://aistudio.google.com/apikey',
        )
      } else {
        setResult(`오류가 발생했습니다: ${message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`page theme-${theme}`}>
      <div className="layout">
        <aside className="sidebar" aria-label="저장된 사주 목록">
          <h2 className="sidebar-title">저장된 사주</h2>
          {listError && <p className="sidebar-error">{listError}</p>}
          {readings.length === 0 && !listError && (
            <p className="sidebar-empty">결과 보기를 누르면 이름 버튼이 여기에 생깁니다.</p>
          )}
          <div className="name-list">
            {readings.map((reading) => (
              <button
                key={reading.id}
                type="button"
                className={`name-button${selectedId === reading.id ? ' is-active' : ''}`}
                onClick={() => handleSelectReading(reading)}
              >
                {reading.name}
              </button>
            ))}
          </div>
        </aside>

        <div className="app">
          <h1>사주미</h1>
          <p className="lead">사주 정보를 입력해 주세요.</p>

          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 홍길동"
            />
          </div>

          <div className="field">
            <label htmlFor="birthDate">생년월일</label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="birthTime">태어난 시간</label>
            <input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={(event) => setBirthTime(event.target.value)}
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
                  onChange={(event) => setGender(event.target.value)}
                />
                남자
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={(event) => setGender(event.target.value)}
                />
                여자
              </label>
              <label>
                <input
                  type="radio"
                  name="gender"
                  value="?"
                  checked={gender === '?'}
                  onChange={(event) => setGender(event.target.value)}
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
                  onChange={(event) => setCalendarType(event.target.value)}
                />
                양력
              </label>
              <label>
                <input
                  type="radio"
                  name="calendarType"
                  value="lunar"
                  checked={calendarType === 'lunar'}
                  onChange={(event) => setCalendarType(event.target.value)}
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

          {!isLoading && selectedReading && (
            <div className="result">
              <h2>저장된 사주</h2>
              <dl className="reading-meta">
                <div>
                  <dt>이름</dt>
                  <dd>{selectedReading.name}</dd>
                </div>
                <div>
                  <dt>생년월일</dt>
                  <dd>{selectedReading.birth_date}</dd>
                </div>
                <div>
                  <dt>태어난 시간</dt>
                  <dd>{formatBirthTime(selectedReading.birth_time)}</dd>
                </div>
                <div>
                  <dt>성별</dt>
                  <dd>{genderLabel(selectedReading.gender)}</dd>
                </div>
                <div>
                  <dt>달력</dt>
                  <dd>{calendarLabel(selectedReading.calendar_type)}</dd>
                </div>
              </dl>
              <h3 className="result-subtitle">사주 결과</h3>
              <p className="result-text">{selectedReading.result}</p>
            </div>
          )}

          {!isLoading && !selectedReading && result && (
            <div className="result">
              <h2>사주 결과</h2>
              <p className="result-text">{result}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
