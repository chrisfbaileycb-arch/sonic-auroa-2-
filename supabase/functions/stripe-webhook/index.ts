/**
 * stripe-webhook
 *
 * The only writer of the `entitlements` table. Runs with the service-role key,
 * so it bypasses RLS — which is precisely why the client has no insert or
 * update policy on that table. A membership can only come from Stripe telling
 * us the money moved.
 *
 * Deploy WITHOUT JWT verification (Stripe does not send a Supabase token):
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 *
 * Secrets:
 *   supabase secrets set STRIPE_SECRET_KEY=sk_live_…
 *   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…
 *
 * Subscribe it to: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted, invoice.payment_failed.
 */
import Stripe from 'npm:stripe@17'
import { adminClient } from '../_shared/auth.ts'

const STATUS_MAP: Record<string, string> = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
  incomplete: 'incomplete',
  incomplete_expired: 'canceled',
}

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!stripeKey || !webhookSecret) {
    return new Response('Stripe is not configured.', { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature.', { status: 400 })

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })
  const payload = await req.text()

  let event: Stripe.Event
  try {
    // Async variant: the sync one uses Node crypto and throws under Deno.
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret)
  } catch (e) {
    console.error('[stripe-webhook] bad signature', e instanceof Error ? e.message : e)
    return new Response('Invalid signature.', { status: 400 })
  }

  const admin = adminClient()

  /** Write (or refresh) one entitlement row. */
  async function record(opts: {
    userId: string
    sku: string
    status: string
    periodEnd: number | null
    customerId: string | null
    subscriptionId: string | null
  }) {
    const { error } = await admin.from('entitlements').upsert(
      {
        user_id: opts.userId,
        sku: opts.sku,
        status: opts.status,
        period_end: opts.periodEnd ? new Date(opts.periodEnd * 1000).toISOString() : null,
        stripe_customer_id: opts.customerId,
        stripe_subscription_id: opts.subscriptionId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,sku' },
    )
    if (error) throw error
  }

  /**
   * Recover the Supabase user for a subscription event. Stripe copies our
   * metadata onto the subscription at creation, but fall back to the customer
   * record for subscriptions created before that was true.
   */
  async function resolveUser(sub: Stripe.Subscription): Promise<{ userId: string; sku: string } | null> {
    const meta = sub.metadata ?? {}
    if (meta.supabase_user_id) {
      return { userId: meta.supabase_user_id, sku: meta.sku ?? 'aurora-year' }
    }
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (!customerId) return null
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return null
    const userId = customer.metadata?.supabase_user_id
    return userId ? { userId, sku: meta.sku ?? 'aurora-year' } : null
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id
        const sku = session.metadata?.sku ?? 'aurora-year'
        if (!userId) break

        let periodEnd: number | null = null
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          periodEnd = sub.current_period_end
        }

        await record({
          userId,
          sku,
          status: 'active',
          periodEnd,
          customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
          subscriptionId,
        })
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const who = await resolveUser(sub)
        if (!who) break
        await record({
          userId: who.userId,
          sku: who.sku,
          status: STATUS_MAP[sub.status] ?? 'canceled',
          periodEnd: sub.current_period_end ?? null,
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
          subscriptionId: sub.id,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        if (!subscriptionId) break
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const who = await resolveUser(sub)
        if (!who) break
        await record({
          userId: who.userId,
          sku: who.sku,
          status: 'past_due',
          periodEnd: sub.current_period_end ?? null,
          customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
          subscriptionId: sub.id,
        })
        break
      }

      default:
        // Unsubscribed event types are acknowledged so Stripe stops retrying.
        break
    }
  } catch (e) {
    // A 500 tells Stripe to retry, which is what we want for a transient
    // database failure — the event is not lost.
    console.error('[stripe-webhook]', event.type, e instanceof Error ? e.message : e)
    return new Response('Handler failed.', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
