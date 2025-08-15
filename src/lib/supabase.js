import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Not fatal for local-only, but helpful to see why DB fetches might fail
  console.warn('Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
})
