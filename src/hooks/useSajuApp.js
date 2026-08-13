import { useEffect, useState } from 'react'
import {
  genderLabel,
  calendarLabel,
  formatBirthTime,
  getPreviewResult,
  isProfileComplete,
} from '../lib/labels'
import {
  clearPendingResult,
  readPendingResult,
  writePendingResult,
} from '../lib/pendingResult'
import {
  deleteReading,
  fetchUserProfile,
  fetchUserReadings,
  generateSajuReading,
  insertReading,
  mapGenerateError,
  updateReading,
  upsertUserProfile,
} from '../lib/sajuService'
import { supabase } from '../lib/supabase'

const emptyForm = {
  name: '',
  birthDate: '',
  birthTime: '',
  gender: '',
  calendarType: 'solar',
}

export default function useSajuApp() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const [form, setForm] = useState(emptyForm)
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
  const [signupForm, setSignupForm] = useState(emptyForm)
  const [signupError, setSignupError] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [shareMessage, setShareMessage] = useState('')

  const user = session?.user ?? null
  const selectedReading = readings.find((item) => item.id === selectedId) || null
  const needsSignup = Boolean(user && profileChecked && !profile)
  const canViewFullResult = Boolean(user && profile)
  const previewResult = getPreviewResult(result)
  const isPreviewLocked = Boolean(result && !canViewFullResult && !selectedReading)
  const busy = isLoading || isSaving || isDeleting || isSavingProfile

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateSignupForm = (key, value) => {
    setSignupForm((prev) => ({ ...prev, [key]: value }))
  }

  const applyProfileToForm = (nextProfile) => {
    if (!nextProfile) return
    setForm({
      name: nextProfile.name || '',
      birthDate: nextProfile.birth_date || '',
      birthTime: formatBirthTime(nextProfile.birth_time),
      gender: nextProfile.gender || '',
      calendarType: nextProfile.calendar_type || 'solar',
    })
  }

  const applyPendingToForm = (pending) => {
    if (!pending) return
    setForm({
      name: pending.name || '',
      birthDate: pending.birthDate || '',
      birthTime: formatBirthTime(pending.birthTime),
      gender: pending.gender || '',
      calendarType: pending.calendarType || 'solar',
    })
    setResult(pending.result || '')
    setTheme(pending.theme || 'default')
    setSelectedId(null)
  }

  const persistCurrentResult = (override = {}) => {
    const payload = {
      name: form.name,
      birthDate: form.birthDate,
      birthTime: form.birthTime,
      gender: form.gender,
      calendarType: form.calendarType,
      result,
      theme,
      ...override,
    }
    if (!String(payload.result || '').trim()) return
    writePendingResult(payload)
  }

  const saveReadingForUser = async (authUser, payload) => {
    const { data: saved, error: saveError } = await insertReading(authUser, payload)
    if (saveError) {
      console.error('Supabase save failed:', saveError)
      setListError('결과는 보여줬지만 저장에 실패했다-멍. schema.sql 실행 여부를 확인해 달라-멍.')
      return null
    }
    setReadings((prev) => [saved, ...prev])
    setSelectedId(saved.id)
    setListError('')
    return saved
  }

  const openSignupModal = (seed = {}) => {
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    setSignupForm({
      name: seed.name || metaName || '',
      birthDate: seed.birth_date || seed.birthDate || '',
      birthTime: formatBirthTime(seed.birth_time || seed.birthTime) || '',
      gender: seed.gender || '',
      calendarType: seed.calendar_type || seed.calendarType || 'solar',
    })
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
        setProfileChecked(true)
        setShowSignupModal(false)
        return
      }

      setProfileChecked(false)

      const pending = readPendingResult()
      if (pending?.result) {
        applyPendingToForm(pending)
      }

      const [{ data: profileData, error: profileError }, { data: readingsData, error: readingsError }] =
        await Promise.all([fetchUserProfile(user.id), fetchUserReadings(user.id)])

      if (cancelled) return

      if (profileError) {
        console.error(profileError)
        setProfile(null)
        setProfileChecked(true)
        setProfileMessage('내 정보를 불러오지 못했다-멍. users 테이블/RLS를 확인해 달라-멍.')
        openSignupModal(pending || form)
      } else if (profileData && isProfileComplete(profileData)) {
        setProfile(profileData)
        if (!pending?.result) {
          applyProfileToForm(profileData)
        }
        setProfileMessage('')
        setShowSignupModal(false)
        setShowLoginModal(false)
        setProfileChecked(true)

        if (pending?.result) {
          await saveReadingForUser(user, pending)
          clearPendingResult()
        }
      } else {
        setProfile(null)
        setProfileChecked(true)
        openSignupModal(profileData || pending || form)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true)
    setAuthError('')
    persistCurrentResult()

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

  const resetForm = ({ clearProfile = false } = {}) => {
    setSelectedId(null)
    setTheme('default')
    setResult('')

    if (clearProfile) {
      setForm(emptyForm)
      return
    }

    if (profile) {
      applyProfileToForm(profile)
      return
    }

    setForm(emptyForm)
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

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    if (!user) {
      setSignupError('로그인이 필요하다-멍.')
      return
    }
    if (!signupForm.name || !signupForm.birthDate || !signupForm.birthTime || !signupForm.gender) {
      setSignupError('이름, 생년월일, 시간, 성별을 모두 입력해 달라-멍.')
      return
    }

    setIsSavingProfile(true)
    setSignupError('')

    const { data, error } = await upsertUserProfile(user, signupForm)
    setIsSavingProfile(false)

    if (error) {
      console.error(error)
      setSignupError('회원가입 정보 저장에 실패했다-멍. users 테이블/RLS를 확인해 달라-멍.')
      return
    }

    setProfile(data)
    applyProfileToForm(data)
    setShowSignupModal(false)
    setShowLoginModal(false)
    setProfileMessage('')

    const pending = readPendingResult()
    if (pending?.result) {
      applyPendingToForm(pending)
      await saveReadingForUser(user, pending)
      clearPendingResult()
    }
  }

  const handleSelectReading = (reading) => {
    setSelectedId(reading.id)
    setTheme(reading.theme || 'default')
    setResult(reading.result || '')
    setForm({
      name: reading.name || '',
      birthDate: reading.birth_date || '',
      birthTime: formatBirthTime(reading.birth_time),
      gender: reading.gender || '',
      calendarType: reading.calendar_type || 'solar',
    })
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
    if (!form.name || !form.birthDate || !form.birthTime || !form.gender || !result) {
      setListError('이름, 생년월일, 시간, 성별, 결과 내용을 모두 입력해 달라-멍.')
      return
    }

    setIsSaving(true)
    setListError('')

    const { data: updated, error } = await updateReading(user, selectedId, {
      ...form,
      theme,
      result,
    })

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
    if (!window.confirm(`"${form.name || '선택한 사주'}" 기록을 삭제할까-멍?`)) return

    setIsDeleting(true)
    setListError('')

    const { error } = await deleteReading(user, selectedId)
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
    if (!form.name || !form.birthDate || !form.birthTime || !form.gender) {
      setTheme('default')
      setSelectedId(null)
      setResult('이름, 생년월일, 태어난 시간, 성별을 모두 입력해 달라-멍.')
      return
    }

    setIsLoading(true)
    setTheme('default')
    setResult('')
    setSelectedId(null)
    setShareMessage('')

    try {
      const generated = await generateSajuReading(form)
      setTheme(generated.theme)
      setResult(generated.result)

      if (user && profile) {
        await saveReadingForUser(user, {
          ...form,
          theme: generated.theme,
          result: generated.result,
        })
      } else {
        writePendingResult({
          ...form,
          theme: generated.theme,
          result: generated.result,
        })
      }
    } catch (error) {
      console.error(error)
      setTheme('default')
      setSelectedId(null)
      setResult(mapGenerateError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareResult = async () => {
    if (!result.trim()) {
      setShareMessage('공유할 결과가 없다-멍.')
      return
    }
    if (!canViewFullResult) {
      setShareMessage('전체 결과를 공유하려면 로그인이 필요하다-멍.')
      setShowLoginModal(true)
      return
    }

    const shareText = [
      `[사주미] ${form.name || '사주미'}님의 사주 결과다-멍`,
      form.birthDate || form.birthTime || form.gender
        ? `생년월일 ${form.birthDate || '-'} / ${formatBirthTime(form.birthTime) || '-'} / ${genderLabel(form.gender)} / ${calendarLabel(form.calendarType)}`
        : null,
      '',
      result.trim(),
      '',
      window.location.origin,
    ]
      .filter((line) => line !== null)
      .join('\n')

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: '사주미',
          text: shareText,
          url: window.location.origin,
        })
        setShareMessage('공유했다-멍!')
        return
      }

      await navigator.clipboard.writeText(shareText)
      setShareMessage('결과를 복사했다-멍. 원하는 곳에 붙여넣으면 된다-멍.')
    } catch (error) {
      if (error?.name === 'AbortError') {
        setShareMessage('')
        return
      }
      console.error(error)
      setShareMessage('공유에 실패했다-멍. 잠시 후 다시 시도해 달라-멍.')
    }
  }

  return {
    authReady,
    authError,
    isAuthLoading,
    user,
    theme,
    form,
    result,
    previewResult,
    isPreviewLocked,
    isLoading,
    readings,
    selectedId,
    selectedReading,
    listError,
    profileMessage,
    profile,
    profileChecked,
    needsSignup,
    showLoginModal,
    showSignupModal,
    signupForm,
    signupError,
    isSavingProfile,
    isSaving,
    isDeleting,
    busy,
    shareMessage,
    updateForm,
    updateSignupForm,
    setResult,
    setShowLoginModal,
    setShowSignupModal,
    openSignupModal,
    handleGoogleLogin,
    handleLogout,
    handleSignupSubmit,
    handleSelectReading,
    handleUpdateReading,
    handleDeleteReading,
    handleResultClick,
    handleShareResult,
    persistCurrentResult,
    resetForm,
  }
}
