import { createClient } from '@supabase/supabase-js'

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env',
  )
}

if (!/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL (got "${supabaseUrl}"). Use https://xxxx.supabase.co without quotes.`,
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
