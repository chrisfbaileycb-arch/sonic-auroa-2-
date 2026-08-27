/**
 * create-checkout-session
 *
 * Opens a Stripe Checkout session for the signed-in caller and hands the URL
 * back to the browser, which redirects to it.
 *
 * The caller is taken from the verified JWT, never from the request body, so a
 * listener cannot start a checkout that grants a membership to someone else.
 * The resulting entitlement is written by the stripe-webhook function — not
 * here — because checkout completing in the browser is not proof of payment.
 *
 * Secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_live_…
 */
import Stripe from 'npm:stripe@17'
import { corsHeaders, json, fail } from '../_shared/cors.ts'
import { callerFromRequest, adminClient } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) {
    return fail('NO_CONNECTION', 'No payment account is connected to this app yet.', 503)
  }

  const user = await callerFromRequest(req)
  if (!user) return fail('NOT_SIGNED_IN', 'Sign in before starting checkout.', 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail('BAD_REQUEST', 'Expected a JSON body.', 400)
  }

  const {
    sku, name, amount, currency = 'USD', kind = 'payment',
    interval = 'year', successUrl, cancelUrl,
  } = body as {
    sku: string; name: string; amount: number; currency: string
    kind: 'subscription' | 'payment'; interval: 'year' | 'month'
    successUrl: string; cancelUrl: string
  }

  if (!sku || !name || typeof amount !== 'number' || !successUrl || !cancelUrl) {
    return fail('BAD_REQUEST', 'Missing sku, name, amount, successUrl or cancelUrl.', 400)
  }
  if (kind !== 'subscription' && kind !== 'payment') {
    return fail('UNSUPPORTED', `Unsupported purchase kind: ${kind}.`, 400)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })

  try {
    // Reuse the customer across checkouts so a renewing member does not
    // accumulate duplicate Stripe customers.
    const admin = adminClient()
    const { data: existing } = await admin
      .from('entitlements')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .maybeSingle()

    let customerId = existing?.stripe_customer_id as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const price = {
      currency: currency.toLowerCase(),
      product_data: { name },
      unit_amount: Math.round(amount * 100),
      ...(kind === 'subscription' ? { recurring: { interval } } : {}),
    }

    const session = await stripe.checkout.sessions.create({
      mode: kind === 'subscription' ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price_data: price, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Echoed back on the webhook — this is how the payment finds its user.
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, sku },
      ...(kind === 'subscription'
        ? { subscription_data: { metadata: { supabase_user_id: user.id, sku } } }
        : {}),
    })

    return json({ url: session.url })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Checkout could not be opened.'
    // Stripe rejects recurring prices on accounts that cannot do subscriptions
    // — the Membership page has specific copy for exactly this case.
    if (/recurring|subscription/i.test(message)) {
      return fail('UNSUPPORTED', message, 400)
    }
    console.error('[create-checkout-session]', message)
    return fail('CHECKOUT_FAILED', message, 500)
  }
})
