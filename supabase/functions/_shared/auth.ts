import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Resolve the caller from their Authorization header. Returns null when the
 * token is missing or invalid — never trust a user id sent in the body.
 */
export async function callerFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

/** Service-role client — bypasses RLS. Only ever used server-side. */
export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}
