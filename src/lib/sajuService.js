import { GoogleGenAI } from '@google/genai/web'
import { SAJU_BASIC_CHART_PROMPT, parseSajuResponse } from '../prompts/sajuBasicChart'
import { genderLabel, calendarLabel } from './labels'
import { supabase } from './supabase'

// 임시: Gemini 할당량 초과 시 true. 다시 API 쓰려면 false로 바꾸세요.
export const USE_MOCK_SAJU = true

export function buildMockSajuText({ name, birthDate, birthTime, gender, calendarType }) {
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

export async function generateSajuReading(form) {
  const apiKey = String(import.meta.env.VITE_GEMINI_API_KEY || '').trim()

  if (!USE_MOCK_SAJU) {
    if (!apiKey) {
      throw new Error('API 키가 없다-멍. .env 파일에 VITE_GEMINI_API_KEY를 확인해 달라-멍.')
    }
    if (/[^\x00-\x7F]/.test(apiKey)) {
      throw new Error(
        'API 키에 영어/숫자 외 문자가 섞여 있다-멍. AI Studio에서 키를 다시 복사해 .env에 붙여넣고 Vite를 재시작해 달라-멍.',
      )
    }
  }

  let rawText = ''

  if (USE_MOCK_SAJU) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    rawText = buildMockSajuText(form)
  } else {
    const ai = new GoogleGenAI({ apiKey })
    const userInput = `
다음 사람의 사주를 기본 차트 기준으로 해석해 주세요.

이름: ${form.name}
성별: ${form.gender} (${genderLabel(form.gender)})
생년월일: ${form.birthDate}
태어난 시간: ${form.birthTime}
달력: ${calendarLabel(form.calendarType)}
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
  return {
    theme: parsed.theme,
    result: parsed.body || '결과를 가져오지 못했다-멍.',
  }
}

export function mapGenerateError(error) {
  const message = error.message || String(error)
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
    return 'Gemini API 사용량 한도를 초과했다-멍. 약 1분 뒤 다시 시도하거나, 내일(태평양 시간 기준) 한도가 초기화된 뒤 사용해 달라-멍. 사용량: https://ai.dev/rate-limit'
  }
  if (message.includes('403') || message.includes('Permission') || message.includes('denied')) {
    return 'API 접근이 거부됐다-멍(403). Google AI Studio에서 Gemini API 키를 새로 발급해 .env의 VITE_GEMINI_API_KEY를 교체한 뒤, Vite를 재시작해 달라-멍. https://aistudio.google.com/apikey'
  }
  if (message.includes('API 키')) return message
  return `오류가 발생했다-멍: ${message}`
}

export async function fetchUserProfile(userId) {
  return supabase.from('users').select('*').eq('id', userId).maybeSingle()
}

export async function fetchUserReadings(userId) {
  return supabase
    .from('saju_readings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function insertReading(authUser, payload) {
  return supabase
    .from('saju_readings')
    .insert({
      user_id: authUser.id,
      name: payload.name,
      birth_date: payload.birthDate,
      birth_time: payload.birthTime,
      gender: payload.gender,
      calendar_type: payload.calendarType,
      theme: payload.theme || 'default',
      result: payload.result,
    })
    .select()
    .single()
}

export async function updateReading(authUser, readingId, payload) {
  return supabase
    .from('saju_readings')
    .update({
      name: payload.name,
      birth_date: payload.birthDate,
      birth_time: payload.birthTime,
      gender: payload.gender,
      calendar_type: payload.calendarType,
      theme: payload.theme,
      result: payload.result,
    })
    .eq('id', readingId)
    .eq('user_id', authUser.id)
    .select()
    .single()
}

export async function deleteReading(authUser, readingId) {
  return supabase
    .from('saju_readings')
    .delete()
    .eq('id', readingId)
    .eq('user_id', authUser.id)
}

export async function upsertUserProfile(authUser, form) {
  return supabase
    .from('users')
    .upsert(
      {
        id: authUser.id,
        email: authUser.email ?? null,
        name: form.name.trim(),
        birth_date: form.birthDate,
        birth_time: form.birthTime,
        gender: form.gender,
        calendar_type: form.calendarType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single()
}
