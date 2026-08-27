/**
 * Live-query hooks — Supabase reads plus a realtime subscription.
 *
 * Replaces the Whacka platform live-data SDK. Two shapes:
 *
 *   useLive(collection)          per-listener documents  (`auraProfile`)
 *   useLiveShared(collection)    app-wide content        (`frequencies`)
 *
 * Both return `{ data, loading, error, refresh }` and re-render when the
 * underlying rows change. `data` is always an array — never null — so the
 * `(rows || [])[0]` idiom in the pages keeps working.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isConfigured } from './supabase'
import { auth } from './auth'
import { db } from './db'

const SHARED_TABLE = 'shared_documents'
const USER_TABLE = 'app_documents'

/**
 * Shared, app-wide content: the frequency catalog. Readable by everyone,
 * signed in or not; only the app owner can write it.
 *
 * @param {string} collection
 * @param {{limit?: number}} [options]
 */
export function useLiveShared(collection, options = {}) {
  const { limit = 100 } = options
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!isConfigured) {
      setData([])
      setLoading(false)
      return
    }
    try {
      const { data: rows, error: err } = await supabase
        .from(SHARED_TABLE)
        .select('data')
        .eq('collection', collection)
        .order('position', { ascending: true })
        .limit(limit)
      if (err) throw err
      setData((rows || []).map((row) => row.data))
      setError(null)
    } catch (e) {
      setError(e)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [collection, limit])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isConfigured) return undefined
    const channel = supabase
      .channel(`shared:${collection}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SHARED_TABLE, filter: `collection=eq.${collection}` },
        () => load()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [collection, load])

  return useMemo(
    () => ({ data, loading, error, refresh: load }),
    [data, loading, error, load]
  )
}

/**
 * The current listener's own documents. Falls back to the on-device copies
 * when signed out, which is what makes the attunement work without an account.
 *
 * @param {string} collection
 */
export function useLive(collection) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(() => auth.getCurrentUser()?.id || null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  useEffect(() => auth.onAuthChange((user) => setUserId(user?.id || null)), [])

  const load = useCallback(async () => {
    try {
      const rows = await db.list(collection)
      if (!aliveRef.current) return
      setData(rows || [])
      setError(null)
    } catch (e) {
      if (!aliveRef.current) return
      setError(e)
      setData([])
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [collection])

  // Reload on mount and whenever the signed-in listener changes — sign-in
  // swaps the whole document set from the device's to the account's.
  useEffect(() => { setLoading(true); load() }, [load, userId])

  useEffect(() => {
    if (!isConfigured || !userId) return undefined
    const channel = supabase
      .channel(`user:${collection}:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: USER_TABLE, filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (!row || row.collection === collection) load()
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [collection, userId, load])

  return useMemo(
    () => ({ data, loading, error, refresh: load }),
    [data, loading, error, load]
  )
}
