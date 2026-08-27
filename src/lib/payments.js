/**
 * Memberships — Stripe, reached through Supabase Edge Functions.
 *
 * Replaces the Whacka platform payments SDK. The split is the usual one: the
 * browser never sees a Stripe secret, so anything that needs one lives in an
 * Edge Function (`supabase/functions/`), and the browser only ever reads the
 * `entitlements` table that the Stripe webhook writes.
 *
 *   checkout()         → create-checkout-session  → redirect to Stripe
 *   status()           → payments-status          → is Stripe wired up at all?
 *   getEntitlements()  → direct read of `entitlements` (RLS: own rows only)
 *   onPayment()        → realtime on `entitlements`, so the unlock is instant
 *
 * `Membership.jsx` branches on two error codes, so they are part of the
 * contract: NO_CONNECTION (owner has not connected Stripe) and UNSUPPORTED
 * (the requested purchase kind cannot be sold through the connected account).
 */
import { supabase, isConfigured } from './supabase'
import { auth } from './auth'

const TABLE = 'entitlements'

function paymentError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

/**
 * Read `?payment=success|canceled` once, at load, before HashRouter has a
 * chance to rewrite the address — then clean it out of the URL so a refresh
 * does not replay the banner.
 */
const initialCheckoutResult = (() => {
  try {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('payment')
    if (status !== 'success' && status !== 'canceled') return null
    params.delete('payment')
    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
    return { status }
  } catch {
    return null
  }
})()

/** Normalise a stored row into the shape `useMembership` expects. */
const toSubscription = (row) => ({
  sku: row.sku,
  status: row.status,
  periodEnd: row.period_end,
})

export const payments = {
  /**
   * @returns {Promise<{subscriptions: Array<{sku: string, status: string, periodEnd: string|null}>}>}
   */
  async getEntitlements() {
    if (!isConfigured || !auth.isAuthenticated()) return { subscriptions: [] }
    const { data, error } = await supabase
      .from(TABLE)
      .select('sku, status, period_end')
      .order('period_end', { ascending: false })
    if (error) throw error
    return { subscriptions: (data || []).map(toSubscription) }
  },

  /**
   * Open Stripe Checkout. Resolves by navigating away, so nothing after the
   * redirect runs.
   *
   * @param {{sku: string, name: string, amount: number, currency: string,
   *          kind: 'subscription'|'payment', interval?: 'year'|'month',
   *          successPath: string, cancelPath: string}} options
   */
  async checkout(options) {
    if (!isConfigured) {
      throw paymentError('NO_CONNECTION', 'Supabase is not configured for this app.')
    }
    if (!auth.isAuthenticated()) {
      throw paymentError('NOT_SIGNED_IN', 'Sign in before starting checkout.')
    }

    const origin = window.location.origin
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        ...options,
        successUrl: `${origin}${options.successPath}`,
        cancelUrl: `${origin}${options.cancelPath}`,
      },
    })

    if (error) {
      // Edge Functions surface a non-2xx as a FunctionsHttpError whose body
      // carries our own `code`. Dig it out so the page can say something useful.
      let payload = null
      try { payload = await error.context?.json?.() } catch { /* body not JSON */ }
      throw paymentError(
        payload?.code || 'CHECKOUT_FAILED',
        payload?.message || error.message || 'Checkout could not be opened.'
      )
    }
    if (!data?.url) {
      throw paymentError('CHECKOUT_FAILED', 'Checkout session came back without a URL.')
    }

    window.location.assign(data.url)
    return { ok: true }
  },

  /**
   * Synchronous. The result of the checkout the listener just came back from,
   * or null on a normal load.
   * @returns {{status: 'success'|'canceled'}|null}
   */
  checkoutResult: () => initialCheckoutResult,

  /**
   * Fires whenever this listener's entitlements change — which is how a
   * membership lights up without a refresh once Stripe's webhook lands.
   *
   * @param {() => void} cb
   * @returns {{unsubscribe: () => void}}
   */
  onPayment(cb) {
    if (!isConfigured) return { unsubscribe: () => {} }

    let channel = null

    const resubscribe = (user) => {
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
      if (!user) return
      channel = supabase
        .channel(`entitlements:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${user.id}` },
          () => cb()
        )
        .subscribe()
    }

    resubscribe(auth.getCurrentUser())
    const stopAuthWatch = auth.onAuthChange(resubscribe)

    return {
      unsubscribe() {
        stopAuthWatch()
        if (channel) supabase.removeChannel(channel)
        channel = null
      },
    }
  },

  /**
   * Owner-facing: is a Stripe account connected and able to take money?
   * @returns {Promise<{available: boolean, error?: boolean}>}
   */
  async status() {
    if (!isConfigured) return { available: false }
    const { data, error } = await supabase.functions.invoke('payments-status')
    if (error) throw error
    return { available: Boolean(data?.available) }
  },
}

/** Kept so the module's export surface matches the platform SDK it replaces. */
export const _internal = { TABLE, paymentError }
