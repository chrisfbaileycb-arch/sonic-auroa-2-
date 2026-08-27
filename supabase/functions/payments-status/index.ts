/**
 * payments-status
 *
 * Owner-facing health check behind the artist portal: is a Stripe key present
 * and does it actually authenticate? Returns only a boolean — no account
 * details cross the wire.
 */
import Stripe from 'npm:stripe@17'
import { corsHeaders, json } from '../_shared/cors.ts'
import { callerFromRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await callerFromRequest(req)
  if (!user) return json({ available: false }, 401)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ available: false })

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })
    // Cheapest call that proves the key is live and the account is usable.
    await stripe.prices.list({ limit: 1 })
    return json({ available: true })
  } catch (e) {
    console.error('[payments-status]', e instanceof Error ? e.message : e)
    return json({ available: false })
  }
})
