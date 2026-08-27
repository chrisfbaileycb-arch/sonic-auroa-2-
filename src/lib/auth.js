/**
 * Authentication — Supabase Auth (Google OAuth).
 *
 * Replaces the Whacka platform auth bridge.
 *
 * The app calls `isAuthenticated()`, `getCurrentUser()` and `isAppOwner()`
 * during render, so all three are SYNCHRONOUS. They read a cache that is
 * seeded from the persisted session at module load and kept current by
 * `onAuthStateChange` — never awaited on the render path.
 */
import { supabase, isConfigured, APP_OWNER_ID, sessionStorageKey } from './supabase'

/** @typedef {{ id: string, email: string|null, displayName: string|null, avatarUrl: string|null }} AppUser */

let currentUser = null
const listeners = new Set()

function toAppUser(user) {
  if (!user) return null
  const meta = user.user_metadata || {}
  return {
    id: user.id,
    email: user.email || null,
    displayName: meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : null),
    avatarUrl: meta.avatar_url || meta.picture || null,
  }
}

/**
 * Seed the cache synchronously from the persisted session so the very first
 * render already knows whether someone is signed in. An expired token here is
 * harmless: onAuthStateChange corrects it a moment later.
 */
function seedFromStorage() {
  const key = sessionStorageKey()
  if (!key) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const expiresAt = parsed?.expires_at
    if (expiresAt && expiresAt * 1000 < Date.now()) return null
    return toAppUser(parsed?.user || parsed?.currentSession?.user)
  } catch {
    return null
  }
}

function emit() {
  for (const cb of listeners) {
    try { cb(currentUser) } catch { /* a listener must not break the others */ }
  }
}

function setUser(next) {
  const changed = (next?.id || null) !== (currentUser?.id || null)
  currentUser = next
  if (changed) emit()
}

if (isConfigured) {
  currentUser = seedFromStorage()
  supabase.auth.getSession().then(({ data }) => setUser(toAppUser(data?.session?.user)))
  supabase.auth.onAuthStateChange((_event, session) => setUser(toAppUser(session?.user)))
}

export const auth = {
  /** Synchronous. True once a session is known to exist. */
  isAuthenticated: () => Boolean(currentUser),

  /** Synchronous. @returns {AppUser|null} */
  getCurrentUser: () => currentUser,

  /** Synchronous. True only for the account named by VITE_APP_OWNER_ID. */
  isAppOwner: () => Boolean(APP_OWNER_ID && currentUser?.id === APP_OWNER_ID),

  /**
   * Subscribe to sign-in / sign-out.
   * @param {(user: AppUser|null) => void} cb
   * @returns {() => void} unsubscribe
   */
  onAuthChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  /**
   * The Account button is a single control for both states, mirroring how the
   * platform used to open one account sheet. Signed out it starts Google OAuth;
   * signed in it offers to sign out.
   *
   * Replace the `confirm()` with a proper account sheet when you want one —
   * this is the only piece of UI the platform used to supply that this port
   * does not.
   */
  async signIn() {
    if (!isConfigured) {
      console.warn('[auth] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — sign-in is disabled.')
      return
    }
    if (currentUser) {
      if (window.confirm(`Signed in as ${currentUser.displayName || currentUser.email}.\n\nSign out?`)) {
        await auth.signOut()
      }
      return
    }
    const { origin, pathname, hash } = window.location
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}${pathname}${hash}` },
    })
    if (error) console.error('[auth] sign-in failed', error)
  },

  async signOut() {
    if (!isConfigured) return
    await supabase.auth.signOut()
    setUser(null)
  },
}

/**
 * Platform hook for adopting a session minted elsewhere (the Whacka host used
 * it to hand the app an already-signed-in user). Nothing calls it in this
 * codebase; kept so the module's export surface is unchanged.
 */
export const adoptSession = async () => {}
