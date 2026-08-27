/**
 * Per-user document store — Supabase `app_documents`, with an on-device fallback.
 *
 * Replaces the Whacka platform data SDK. The app stores three things through
 * it: the attunement profile (`auraProfile`), the resumable playback snapshot
 * (`playbackState`) and the free-trial meter (`trialUsage`).
 *
 * Signed in  → rows in Supabase, so the data follows the listener everywhere.
 * Signed out → localStorage, so the app is fully usable without an account.
 *
 * Signing in migrates anything written on-device up to the account, but never
 * overwrites a document the account already has — the server copy wins, since
 * it may be newer and from another device.
 */
import { supabase, isConfigured } from './supabase'
import { auth } from './auth'

const TABLE = 'app_documents'
const LOCAL_PREFIX = 'sonicaura:doc:'

const localKey = (collection, id) => `${LOCAL_PREFIX}${collection}:${id}`

function localGet(collection, id) {
  try {
    const raw = window.localStorage.getItem(localKey(collection, id))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function localSet(collection, id, value) {
  try {
    window.localStorage.setItem(localKey(collection, id), JSON.stringify(value))
  } catch {
    /* private mode / quota — the sitting still works, it just will not persist */
  }
}

function localList(collection) {
  const out = []
  try {
    const prefix = `${LOCAL_PREFIX}${collection}:`
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      const raw = window.localStorage.getItem(key)
      if (raw) out.push(JSON.parse(raw))
    }
  } catch {
    /* fall through to whatever we collected */
  }
  return out
}

/** True when reads and writes should go to Supabase rather than the device. */
const remote = () => isConfigured && auth.isAuthenticated()

export const db = {
  /**
   * @param {string} collection
   * @param {string} id
   * @returns {Promise<object|null>} the stored document, or null
   */
  async get(collection, id) {
    if (!remote()) return localGet(collection, id)
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('collection', collection)
      .eq('doc_id', id)
      .maybeSingle()
    if (error) throw error
    return data?.data ?? null
  },

  /**
   * Create or replace a document.
   * @param {string} collection
   * @param {object} value
   * @param {string} id
   */
  async upsert(collection, value, id) {
    // Always keep the device copy current: it is what a signed-out listener
    // reads, and what gets migrated up if they sign in later.
    localSet(collection, id, value)
    if (!remote()) return value
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        {
          user_id: auth.getCurrentUser().id,
          collection,
          doc_id: id,
          data: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,collection,doc_id' }
      )
      .select('data')
      .single()
    if (error) throw error
    return data?.data ?? value
  },

  /**
   * Every document in a collection for the current listener.
   * @returns {Promise<object[]>}
   */
  async list(collection) {
    if (!remote()) return localList(collection)
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('collection', collection)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map((row) => row.data)
  },

  async remove(collection, id) {
    try {
      window.localStorage.removeItem(localKey(collection, id))
    } catch { /* nothing to clean up */ }
    if (!remote()) return
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('collection', collection)
      .eq('doc_id', id)
    if (error) throw error
  },
}

/**
 * Push on-device documents up to a freshly signed-in account, skipping any the
 * account already holds. Runs once per sign-in.
 */
async function migrateLocalToRemote() {
  if (!remote()) return
  const pending = []
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(LOCAL_PREFIX)) continue
      const [collection, ...rest] = key.slice(LOCAL_PREFIX.length).split(':')
      const id = rest.join(':')
      if (!collection || !id) continue
      const raw = window.localStorage.getItem(key)
      if (raw) pending.push({ collection, id, value: JSON.parse(raw) })
    }
  } catch {
    return
  }

  for (const { collection, id, value } of pending) {
    try {
      const existing = await db.get(collection, id)
      if (existing == null) await db.upsert(collection, value, id)
    } catch {
      /* a failed migration is not worth blocking sign-in over */
    }
  }
}

if (isConfigured) {
  auth.onAuthChange((user) => { if (user) migrateLocalToRemote() })
}
