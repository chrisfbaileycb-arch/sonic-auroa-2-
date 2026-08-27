/**
 * Supabase client — the single connection this app makes to its backend.
 *
 * Replaces the Whacka platform runtime. Everything else in `src/lib/` is built
 * on top of this file.
 *
 * The app is deliberately tolerant of a missing configuration: with no env vars
 * set, `supabase` is null, `isConfigured` is false, and the rest of the library
 * degrades to on-device behaviour (localStorage) instead of throwing. That
 * keeps `npm run dev` useful before a Supabase project exists.
 */
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || ''
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/** The app owner's auth user id — unlocks the artist portal and owner entitlement. */
export const APP_OWNER_ID = import.meta.env.VITE_APP_OWNER_ID || ''

/** Storage bucket holding the ambient / instrumental audio beds. */
export const AUDIO_BUCKET = import.meta.env.VITE_AUDIO_BUCKET || 'app-audio'

export const isConfigured = Boolean(URL && ANON_KEY)

export const supabase = isConfigured
  ? createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The app runs on HashRouter, so OAuth returns as `/?code=…#/route`.
        // The `?code=` is in the query string, ahead of the hash, which is
        // exactly where the PKCE exchange looks for it.
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

/**
 * The localStorage key supabase-js persists the session under. We read it
 * synchronously at start-up (see auth.js) because the app asks
 * `auth.isAuthenticated()` during the first render, before any await can land.
 */
export function sessionStorageKey() {
  if (!URL) return null
  try {
    const ref = new globalThis.URL(URL).hostname.split('.')[0]
    return ref ? `sb-${ref}-auth-token` : null
  } catch {
    return null
  }
}
