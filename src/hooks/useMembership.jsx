import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../lib/db'
import { payments } from '../lib/payments'
import { auth } from '../lib/auth'

const MembershipContext = createContext(null)

/** Stable unlock key — renaming this orphans every existing membership. */
export const SKU = 'aurora-year'
export const PRICE = 24.95
export const CURRENCY = 'USD'

/** The free trial: 30 minutes of cumulative listening across everything. */
export const TRIAL_SECONDS = 30 * 60
export const TRIAL_MINUTES = 30

const TRIAL_COLL = 'trialUsage'
const TRIAL_ID = 'listening'
/** Write the running total at most this often (in listened seconds). */
const FLUSH_EVERY = 60

export function MembershipProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [renewsAt, setRenewsAt] = useState(null)
  const [signedIn, setSignedIn] = useState(auth.isAuthenticated())

  // ─── trial meter ────────────────────────────────────────────────
  const [trialUsed, setTrialUsed] = useState(0)
  const [trialLoaded, setTrialLoaded] = useState(false)
  const usedRef = useRef(0)
  const flushedRef = useRef(0)
  const memberRef = useRef(false)

  /** null when closed · 'expired' | 'locked' when the unlock modal is up */
  const [unlockReason, setUnlockReason] = useState(null)

  const refresh = useCallback(async () => {
    const owner = auth.isAppOwner()
    setIsOwner(owner)
    try {
      const ent = await payments.getEntitlements()
      const live = (ent?.subscriptions || []).filter(
        (s) => s.status === 'active' || s.status === 'past_due'
      )
      const mine = live.find((s) => s.sku === SKU) || live[0] || null
      const member = !!mine || owner
      setIsMember(member)
      memberRef.current = member
      setRenewsAt(mine?.periodEnd || null)
    } catch (e) {
      setIsMember(owner)
      memberRef.current = owner
      setRenewsAt(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTrial = useCallback(async () => {
    try {
      const row = await db.get(TRIAL_COLL, TRIAL_ID)
      const stored = Math.max(0, Math.round(row?.seconds || 0))
      if (stored > usedRef.current) {
        usedRef.current = stored
        setTrialUsed(stored)
      }
      flushedRef.current = usedRef.current
    } catch (e) {
      /* offline — the local count still applies for this sitting */
    } finally {
      setTrialLoaded(true)
    }
  }, [])

  const flushTrial = useCallback(async (force) => {
    if (memberRef.current) return
    if (!force && usedRef.current - flushedRef.current < FLUSH_EVERY) return
    if (usedRef.current === flushedRef.current) return
    const value = usedRef.current
    flushedRef.current = value
    try {
      await db.upsert(TRIAL_COLL, { seconds: value, updatedAt: Date.now() }, TRIAL_ID)
    } catch (e) {
      /* try again on the next flush */
    }
  }, [])

  /**
   * Count listened time against the trial. Returns the seconds of trial left,
   * so the player knows when to stop. Members are never metered.
   */
  const addPlayback = useCallback((sec) => {
    if (memberRef.current) return TRIAL_SECONDS
    usedRef.current = Math.min(TRIAL_SECONDS + 5, usedRef.current + sec)
    setTrialUsed(usedRef.current)
    const left = Math.max(0, TRIAL_SECONDS - usedRef.current)
    flushTrial(left <= 0)
    return left
  }, [flushTrial])

  const openUnlock = useCallback((reason) => setUnlockReason(reason || 'locked'), [])
  const closeUnlock = useCallback(() => setUnlockReason(null), [])

  /** Opens hosted checkout for the annual pass. Sign-in first, always. */
  const startCheckout = useCallback(async () => {
    if (!auth.isAuthenticated()) {
      auth.signIn()
      return { needsSignIn: true }
    }
    await payments.checkout({
      sku: SKU,
      name: 'SonicAurora Membership — 1 year',
      amount: PRICE,
      currency: CURRENCY,
      kind: 'subscription',
      interval: 'year',
      successPath: '/?payment=success#/membership',
      cancelPath: '/?payment=canceled#/membership',
    })
    return { ok: true }
  }, [])

  useEffect(() => { loadTrial() }, [loadTrial])

  // re-check on sign-in / sign-out
  useEffect(() => {
    return auth.onAuthChange((u) => {
      setSignedIn(!!u)
      setLoading(true)
      refresh()
      loadTrial()
    })
  }, [refresh, loadTrial])

  // live unlock the moment the provider confirms a payment
  useEffect(() => payments.onPayment(() => refresh()).unsubscribe, [refresh])

  // and when the payer switches back to the app after the hosted page
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh()
      else flushTrial(true)
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', () => flushTrial(true))
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh, flushTrial])

  // a fresh membership wipes the meter from view
  useEffect(() => { if (isMember) setUnlockReason(null) }, [isMember])

  const trialLeft = Math.max(0, TRIAL_SECONDS - trialUsed)
  const hasAccess = isMember || trialLeft > 0

  const value = {
    loading,
    isMember,
    isOwner,
    signedIn,
    renewsAt,
    refresh,
    // trial
    trialUsed,
    trialLeft,
    trialLoaded,
    trialExpired: !isMember && trialLeft <= 0,
    hasAccess,
    addPlayback,
    // unlock modal + checkout
    unlockReason,
    openUnlock,
    closeUnlock,
    startCheckout,
  }

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>
}

export function useMembership() {
  const ctx = useContext(MembershipContext)
  if (!ctx) throw new Error('useMembership must be used within MembershipProvider')
  return ctx
}
