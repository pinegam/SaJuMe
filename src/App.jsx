import { useEffect, useState } from 'react'
import { GoogleGenAI } from '@google/genai/web'
import { SAJU_BASIC_CHART_PROMPT, parseSajuResponse } from './prompts/sajuBasicChart'
import { supabase } from './lib/supabase'
import mascotImg from './assets/mascot.png'
import './App.css'

// 임시: Gemini 할당량 초과 시 true. 다시 API 쓰려면 false로 바꾸세요.
const USE_MOCK_SAJU = true

function Mascot({ className = '', size = 'md', alt = '사주미 마스코트' }) {
  return (
    <img
      src={mascotImg}
      alt={alt}
      className={`mascot mascot-${size}${className ? ` ${className}` : ''}`}
      draggable={false}
    />
  )
}

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
[임시 결과] ${name}님의 사주를 살짝 들여다봤다-멍.

생년월일 ${birthDate}, 태어난 시간 ${birthTime}, 성별 ${genderLabel(gender)}, ${calendarLabel(calendarType)} 기준으로 보면 전반적으로 균형 잡힌 기운이 느껴진다-멍. 겉으로는 차분하지만 속으로는 추진력이 강한 편이고, 한 번 마음먹은 일은 끝까지 밀어붙이는 기질이 돋보인다-멍.

재능 면에서는 사람과 상황을 빠르게 읽고 말로 풀어내는 능력이 눈에 띈다-멍. 다만 생각이 많아지면 결정을 미루는 경향이 있어, 중요한 순간에는 기준을 하나 정해 두면 좋다-멍.

약점은 속도에 치우칠 때 디테일을 놓치기 쉽다는 점이다-멍. 반대로 장점은 위기 상황에서도 분위기나 흐름을 바꾸는 힘이 있다는 거다-멍.

특이하게도 ${birthTime} 시간대 기운이 성격의 리듬을 크게 좌우하는 편이라, 하루의 시작과 마무리를 스스로 설계할 때 컨디션이 안정된다-멍.

이건 임시 문구다-멍. API 한도가 회복되면 더 정확한 해석으로 바꿔줄게-멍.`
}

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

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
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileChecked, setProfileChecked] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [signupName, setSignupName] = useState('')
  const [signupBirthDate, setSignupBirthDate] = useState('')
  const [signupBirthTime, setSignupBirthTime] = useState('')
  const [signupGender, setSignupGender] = useState('')
  const [signupCalendarType, setSignupCalendarType] = useState('solar')
  const [signupError, setSignupError] = useState('')

  const user = session?.user ?? null
  const selectedReading = readings.find((item) => item.id === selectedId) || null
  const needsSignup = Boolean(user && profileChecked && !profile)

  const isProfileComplete = (row) =>
    Boolean(row?.name && row?.birth_date && row?.birth_time && row?.gender)

  const applyProfileToForm = (nextProfile) => {
    if (!nextProfile) return
    setName(nextProfile.name || '')
    setBirthDate(nextProfile.birth_date || '')
    setBirthTime(formatBirthTime(nextProfile.birth_time))
    setGender(nextProfile.gender || '')
    setCalendarType(nextProfile.calendar_type || 'solar')
  }

  const openSignupModal = (seed = {}) => {
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    setSignupName(seed.name || metaName || '')
    setSignupBirthDate(seed.birth_date || '')
    setSignupBirthTime(formatBirthTime(seed.birth_time) || '')
    setSignupGender(seed.gender || '')
    setSignupCalendarType(seed.calendar_type || 'solar')
    setSignupError('')
    setShowSignupModal(true)
  }

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error(error)
        setAuthError('로그인 상태를 확인하지 못했다-멍.')
      }
      setSession(data.session ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      setAuthError('')
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadUserData() {
      if (!user) {
        setReadings([])
        setSelectedId(null)
        setListError('')
        setProfile(null)
        setProfileMessage('')
        setProfileChecked(false)
        setShowSignupModal(false)
        return
      }

      setProfileChecked(false)

      const [{ data: profileData, error: profileError }, { data: readingsData, error: readingsError }] =
        await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
          supabase
            .from('saju_readings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])

      if (cancelled) return

      if (profileError) {
        console.error(profileError)
        setProfile(null)
        setProfileChecked(true)
        setProfileMessage('내 정보를 불러오지 못했다-멍. users 테이블/RLS를 확인해 달라-멍.')
        openSignupModal()
      } else if (profileData && isProfileComplete(profileData)) {
        setProfile(profileData)
        applyProfileToForm(profileData)
        setProfileMessage('')
        setShowSignupModal(false)
        setProfileChecked(true)
      } else {
        setProfile(null)
        setProfileChecked(true)
        openSignupModal(profileData || {})
      }

      if (readingsError) {
        console.error(readingsError)
        setListError('저장된 사주 목록을 불러오지 못했다-멍. schema.sql 실행 여부를 확인해 달라-멍.')
      } else {
        setReadings(readingsData || [])
        setListError('')
      }
    }

    loadUserData()
    return () => {
      cancelled = true
    }
  }, [user])

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true)
    setAuthError('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      console.error(error)
      setAuthError(error.message || 'Google 로그인에 실패했다-멍.')
      setIsAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signOut()
    setIsAuthLoading(false)

    if (error) {
      console.error(error)
      setAuthError(error.message || '로그아웃에 실패했다-멍.')
      return
    }

    resetForm({ clearProfile: true })
    setReadings([])
    setProfile(null)
    setShowSignupModal(false)
    setProfileChecked(false)
  }

  const resetForm = ({ clearProfile = false } = {}) => {
    setSelectedId(null)
    setTheme('default')
    setResult('')

    if (clearProfile) {
      setName('')
      setBirthDate('')
      setBirthTime('')
      setGender('')
      setCalendarType('solar')
      return
    }

    if (profile) {
      applyProfileToForm(profile)
      return
    }

    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('solar')
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      setSignupError('로그인이 필요하다-멍.')
      return
    }
    if (!signupName || !signupBirthDate || !signupBirthTime || !signupGender) {
      setSignupError('이름, 생년월일, 시간, 성별을 모두 입력해 달라-멍.')
      return
    }

    setIsSavingProfile(true)
    setSignupError('')

    const payload = {
      id: user.id,
      email: user.email ?? null,
      name: signupName.trim(),
      birth_date: signupBirthDate,
      birth_time: signupBirthTime,
      gender: signupGender,
      calendar_type: signupCalendarType,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    setIsSavingProfile(false)

    if (error) {
      console.error(error)
      setSignupError('회원가입 정보 저장에 실패했다-멍. users 테이블/RLS를 확인해 달라-멍.')
      return
    }

    setProfile(data)
    applyProfileToForm(data)
    setShowSignupModal(false)
    setProfileMessage('')
  }

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

  const handleUpdateReading = async () => {
    if (!user) {
      setListError('로그인이 필요하다-멍.')
      return
    }
    if (!selectedId) {
      setListError('수정할 사주를 왼쪽 목록에서 선택해 달라-멍.')
      return
    }
    if (!name || !birthDate || !birthTime || !gender || !result) {
      setListError('이름, 생년월일, 시간, 성별, 결과 내용을 모두 입력해 달라-멍.')
      return
    }

    setIsSaving(true)
    setListError('')

    const { data: updated, error } = await supabase
      .from('saju_readings')
      .update({
        name,
        birth_date: birthDate,
        birth_time: birthTime,
        gender,
        calendar_type: calendarType,
        theme,
        result,
      })
      .eq('id', selectedId)
      .eq('user_id', user.id)
      .select()
      .single()

    setIsSaving(false)

    if (error) {
      console.error(error)
      setListError('수정에 실패했다-멍. schema.sql의 update 정책을 확인해 달라-멍.')
      return
    }

    setReadings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  const handleDeleteReading = async () => {
    if (!user) {
      setListError('로그인이 필요하다-멍.')
      return
    }
    if (!selectedId) {
      setListError('삭제할 사주를 왼쪽 목록에서 선택해 달라-멍.')
      return
    }
    if (!window.confirm(`"${name || '선택한 사주'}" 기록을 삭제할까-멍?`)) return

    setIsDeleting(true)
    setListError('')

    const { error } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', selectedId)
      .eq('user_id', user.id)

    setIsDeleting(false)

    if (error) {
      console.error(error)
      setListError('삭제에 실패했다-멍. schema.sql의 delete 정책을 확인해 달라-멍.')
      return
    }

    setReadings((prev) => prev.filter((item) => item.id !== selectedId))
    resetForm()
  }

  const handleResultClick = async () => {
    if (!user) {
      setTheme('default')
      setResult('Google 로그인 후 결과를 저장할 수 있다-멍.')
      return
    }

    if (!name || !birthDate || !birthTime || !gender) {
      setTheme('default')
      setSelectedId(null)
      setResult('이름, 생년월일, 태어난 시간, 성별을 모두 입력해 달라-멍.')
      return
    }

    const apiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()
    if (!USE_MOCK_SAJU) {
      if (!apiKey) {
        setTheme('default')
        setSelectedId(null)
        setResult('API 키가 없다-멍. .env 파일에 VITE_GEMINI_API_KEY를 확인해 달라-멍.')
        return
      }
      if (/[^\x00-\x7F]/.test(apiKey)) {
        setTheme('default')
        setSelectedId(null)
        setResult(
          'API 키에 영어/숫자 외 문자가 섞여 있다-멍. AI Studio에서 키를 다시 복사해 .env에 붙여넣고 Vite를 재시작해 달라-멍.',
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
      const resultBody = parsed.body || '결과를 가져오지 못했다-멍.'
      setTheme(parsed.theme)
      setResult(resultBody)

      const { data: saved, error: saveError } = await supabase
        .from('saju_readings')
        .insert({
          user_id: user.id,
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
        setListError('결과는 보여줬지만 저장에 실패했다-멍. schema.sql 실행 여부를 확인해 달라-멍.')
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
          'Gemini API 사용량 한도를 초과했다-멍. 약 1분 뒤 다시 시도하거나, 내일(태평양 시간 기준) 한도가 초기화된 뒤 사용해 달라-멍. 사용량: https://ai.dev/rate-limit',
        )
      } else if (message.includes('403') || message.includes('Permission') || message.includes('denied')) {
        setResult(
          'API 접근이 거부됐다-멍(403). Google AI Studio에서 Gemini API 키를 새로 발급해 .env의 VITE_GEMINI_API_KEY를 교체한 뒤, Vite를 재시작해 달라-멍. https://aistudio.google.com/apikey',
        )
      } else {
        setResult(`오류가 발생했다-멍: ${message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!authReady || (user && !profileChecked)) {
    return (
      <div className="page theme-default">
        <div className="auth-shell">
          <Mascot size="lg" className="mascot-bob" />
          <p className="auth-status">로그인 상태 확인 중이다-멍...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page theme-default">
        <div className="auth-shell">
          <Mascot size="hero" className="mascot-bob" />
          <p className="brand">사주미</p>
          <p className="auth-lead">안녕하다-멍. Google로 로그인하면 사주를 같이 볼 수 있다-멍.</p>
          {authError && <p className="auth-error">{authError}</p>}
          <button
            type="button"
            className="google-button"
            onClick={handleGoogleLogin}
            disabled={isAuthLoading}
          >
            {isAuthLoading ? '이동 중이다-멍...' : 'Google로 계속하기'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`page theme-${theme}`}>
      {showSignupModal && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="signup-title"
          >
            <div className="modal-mascot-row">
              <Mascot size="md" className="mascot-bob" />
              <div>
                <p className="modal-brand">사주미</p>
                <h2 id="signup-title" className="modal-title">
                  {needsSignup ? '회원가입' : '내 정보 수정'}
                </h2>
              </div>
            </div>
            <p className="modal-lead">
              {needsSignup
                ? '처음 만났다-멍. 사주 해석에 필요한 기본 정보를 알려달라-멍.'
                : '저장된 기본 정보를 고칠 수 있다-멍.'}
            </p>
            <form className="modal-form" onSubmit={handleSignupSubmit}>
              <div className="field">
                <label htmlFor="signup-name">이름</label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupName}
                  onChange={(event) => setSignupName(event.target.value)}
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
                  value={signupBirthDate}
                  onChange={(event) => setSignupBirthDate(event.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="signup-birthTime">태어난 시간</label>
                <input
                  id="signup-birthTime"
                  type="time"
                  value={signupBirthTime}
                  onChange={(event) => setSignupBirthTime(event.target.value)}
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
                      checked={signupGender === 'male'}
                      onChange={(event) => setSignupGender(event.target.value)}
                      required
                    />
                    남자
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="signup-gender"
                      value="female"
                      checked={signupGender === 'female'}
                      onChange={(event) => setSignupGender(event.target.value)}
                    />
                    여자
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="signup-gender"
                      value="?"
                      checked={signupGender === '?'}
                      onChange={(event) => setSignupGender(event.target.value)}
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
                      checked={signupCalendarType === 'solar'}
                      onChange={(event) => setSignupCalendarType(event.target.value)}
                    />
                    양력
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="signup-calendarType"
                      value="lunar"
                      checked={signupCalendarType === 'lunar'}
                      onChange={(event) => setSignupCalendarType(event.target.value)}
                    />
                    음력
                  </label>
                </div>
              </div>

              {signupError && <p className="auth-error">{signupError}</p>}

              <button
                type="submit"
                className="result-button"
                disabled={isSavingProfile}
              >
                {isSavingProfile
                  ? '저장 중이다-멍...'
                  : needsSignup
                    ? '가입 완료'
                    : '저장'}
              </button>
              {needsSignup ? (
                <button
                  type="button"
                  className="ghost-button modal-logout"
                  onClick={handleLogout}
                  disabled={isAuthLoading || isSavingProfile}
                >
                  다른 계정으로 로그인
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button modal-logout"
                  onClick={() => setShowSignupModal(false)}
                  disabled={isSavingProfile}
                >
                  취소
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {!needsSignup && (
      <div className="layout">
        <aside className="sidebar" aria-label="저장된 사주 목록">
          <div className="sidebar-header">
            <h2 className="sidebar-title">저장된 사주</h2>
            <button type="button" className="ghost-button" onClick={() => resetForm()}>
              내 정보로
            </button>
          </div>
          {listError && <p className="sidebar-error">{listError}</p>}
          {readings.length === 0 && !listError && (
            <div className="sidebar-empty-block">
              <Mascot size="sm" />
              <p className="sidebar-empty">아직 없다-멍. 결과 보기를 누르면 여기에 생긴다-멍.</p>
            </div>
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
          <div className="app-header">
            <div className="app-title-row">
              <Mascot size="sm" className="mascot-bob" />
              <div>
                <h1>사주미</h1>
                <p className="lead">정보를 알려주면 사주를 봐줄게-멍.</p>
              </div>
            </div>
            <div className="user-chip">
              <span className="user-email">{user.email}</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => openSignupModal(profile || {})}
              >
                내 정보 수정
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleLogout}
                disabled={isAuthLoading}
              >
                로그아웃
              </button>
            </div>
          </div>

          {authError && <p className="sidebar-error">{authError}</p>}
          {profileMessage && <p className="profile-message">{profileMessage}</p>}

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

          <div className="action-row">
            <button
              type="button"
              className="result-button"
              onClick={handleResultClick}
              disabled={isLoading || isSaving || isDeleting || isSavingProfile}
            >
              {isLoading ? '해석 중이다-멍...' : selectedId ? '새로 해석·저장' : '결과 보기'}
            </button>
            {selectedId && (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleUpdateReading}
                  disabled={isLoading || isSaving || isDeleting || isSavingProfile}
                >
                  {isSaving ? '저장 중이다-멍...' : '수정 저장'}
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleDeleteReading}
                  disabled={isLoading || isSaving || isDeleting || isSavingProfile}
                >
                  {isDeleting ? '삭제 중이다-멍...' : '삭제'}
                </button>
              </>
            )}
          </div>

          {isLoading && (
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
          )}

          {!isLoading && selectedReading && (
            <div className="result">
              <div className="result-heading">
                <Mascot size="xs" />
                <h2>저장된 사주</h2>
              </div>
              <dl className="reading-meta">
                <div>
                  <dt>이름</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt>생년월일</dt>
                  <dd>{birthDate}</dd>
                </div>
                <div>
                  <dt>태어난 시간</dt>
                  <dd>{formatBirthTime(birthTime)}</dd>
                </div>
                <div>
                  <dt>성별</dt>
                  <dd>{genderLabel(gender)}</dd>
                </div>
                <div>
                  <dt>달력</dt>
                  <dd>{calendarLabel(calendarType)}</dd>
                </div>
              </dl>
              <h3 className="result-subtitle">사주 결과</h3>
              <textarea
                className="result-editor"
                value={result}
                onChange={(event) => setResult(event.target.value)}
                rows={12}
                aria-label="사주 결과 수정"
              />
              <p className="result-hint">내용을 고친 뒤 「수정 저장」을 누르면 반영된다-멍.</p>
            </div>
          )}

          {!isLoading && !selectedReading && result && (
            <div className="result">
              <div className="result-heading">
                <Mascot size="xs" />
                <h2>사주 결과</h2>
              </div>
              <p className="result-text">{result}</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export default App
