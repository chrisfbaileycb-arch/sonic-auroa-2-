# SonicAura

A layered sound-therapy app. A listener picks an *intention*, gets matched to a healing
frequency, and plays it over an environment (rain, ocean, forest, fire) and an
instrumental bed — three audio layers running at once, for a chosen duration, with a
moving ambient visual behind it.

React 18 + Vite 5 + Tailwind, built as a mobile-first PWA.

## Status

This repository is the single source of truth for the SonicAura codebase.

The Whacka platform layer has been replaced with a Supabase backend: auth, the
document store, live queries, audio resolution and memberships are all real
implementations now. See [Backend setup](#backend-setup) to point it at a
project of your own.

The original export notice is kept at [WHACKA-EXPORT.md](WHACKA-EXPORT.md) for
provenance; the initial commit is that export unmodified.

With no Supabase project configured the app still runs — it falls back to
on-device storage so the UI is fully browsable — but the frequency library will
be empty and sign-in and memberships are inert.

## Structure

```
index.html            # Shell: error capture, OAuth-return handling, safe-area CSS
src/
  main.jsx            # Entry point (platform bootstrap stubbed out)
  App.jsx             # HashRouter, providers, persistent nav + mini-player
  index.css           # Tailwind layers and theme tokens
  intents.js          # The 8 intentions (healing, clarity, sleep, …)
  soundscapes.js      # Ambience + instrumental layer catalogs
  blends.js           # Curated frequency + ambience + music combinations
  pages/
    Home.jsx          # Frequency browse + blend entry points
    Attune.jsx        # Intention-led matching flow
    FrequencyDetail.jsx
    Session.jsx       # The active listening session
    Membership.jsx    # Plans / unlock
  components/         # AuraBackdrop, AmbientVisual, BottomNav, MiniPlayer,
                      # BlendPicker, DurationPicker, GateLock, UnlockModal, …
  hooks/
    usePlayer.jsx     # Multi-layer audio engine (the core of the app)
    useMembership.jsx # Entitlement state
  lib/                # Whacka SDK stubs — NOT implementations (see below)
vite.config.js        # Plus two defensive transforms (see Build notes)
```

Routing is hash-based (`HashRouter`), so the app works when served from any static path.

## The `src/lib/` layer

Six modules are live implementations:

| Module | Backed by |
| --- | --- |
| `supabase.js` | The shared client. Everything else builds on it. |
| `auth.js` | Supabase Auth (Google OAuth). Synchronous accessors over a cached session, because the app reads auth state during render. |
| `db.js` | `app_documents` when signed in, `localStorage` when not. Signing in migrates on-device documents up without overwriting newer server copies. |
| `useLive.js` | `useLive` (per-listener) and `useLiveShared` (app-wide catalog), both with realtime subscriptions. |
| `audio.js` | Supabase Storage public URLs for the ambient and instrumental beds. |
| `payments.js` | Stripe via Edge Functions; entitlements read straight from the table. |

The remaining files (`_gate.js`, `_headers.js`, `_host-bridge.js`, and the other
underscore-prefixed modules) are still the original platform stubs. Nothing in
the app imports them — `_gate.js` is reached only by `GateLock.jsx`, which is
itself unreferenced — so they are inert. They are kept rather than deleted so
the export stays diffable against the original.

## Running it standalone

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase details
npm run dev
```

`npm run build` produces `dist/`; `npm run preview` serves it.

## Backend setup

1. **Create a Supabase project**, then put its URL and anon key in `.env.local`.
   Both are public by design — the security boundary is row-level security, not
   the key.

2. **Apply the migrations:**

   ```bash
   supabase link --project-ref <your-ref>
   supabase db push
   ```

   `0001_init.sql` creates the three tables and their RLS policies.
   `0002_seed_frequencies.sql` seeds the catalog — the app shows an empty
   library without it. The seed is re-runnable, so it doubles as the way to
   push catalog edits.

3. **Enable Google sign-in** under Authentication → Providers, and add your
   dev and production origins to the redirect allow-list.

4. **Make yourself the owner.** Sign in once, find your user id under
   Authentication → Users, then:

   ```sql
   insert into public.app_owners (user_id) values ('<your-auth-uid>');
   ```

   Also set `VITE_APP_OWNER_ID` to the same id — the table governs write access
   to the catalog, the env var governs what the UI reveals (the artist portal,
   reached by holding the version line in About).

5. **Audio.** Create a public storage bucket (default name `app-audio`) and
   upload the beds as `ambient/<id>.mp3`, where `<id>` matches the ids in
   `src/soundscapes.js`. A missing file degrades quietly — that layer just
   stays silent.

6. **Payments** (optional — the app works without it, memberships simply cannot
   be bought):

   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_…
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…
   supabase functions deploy create-checkout-session
   supabase functions deploy payments-status
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```

   The webhook needs `--no-verify-jwt` because Stripe does not send a Supabase
   token. Point it at `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted` and
   `invoice.payment_failed`.

### How the security boundary works

The browser holds only the anon key, so the policies in `0001_init.sql` are what
actually protect the data:

- A listener can read and write **only their own** `app_documents`. `with check`
  on every write is what stops a forged `user_id`.
- `shared_documents` is world-readable (the library must render before anyone
  signs in) and writable only by rows in `app_owners`.
- `entitlements` is **read-only to everyone**. It has no insert or update policy
  at all — only the Stripe webhook writes it, using the service-role key. A
  client cannot grant itself a membership.

These were verified against a live Postgres: cross-user reads, forged inserts
and self-granted memberships are all rejected.

## Build notes

`vite.config.js` carries two custom transforms inherited from the platform template:

- **`lucideSafeImport`** — rewrites named `lucide-react` imports to a namespace import
  with a per-icon `Circle` fallback, so an unknown icon name renders a placeholder
  instead of crashing the app.
- **`reactHooksAutoImport`** — scans for used React hooks and patches missing entries
  into the `react` import at build time.

Both are safety nets for generated code. They are harmless, but if this codebase moves
to hand-maintained development, removing them makes missing-import bugs fail loudly
instead of silently — which is what you want.

## Known behaviour worth knowing

- **`/track/:slug` shows "Loading…" when the catalog is empty.** The page does
  not distinguish "still loading" from "no such frequency", so an unseeded or
  unreachable backend leaves it on that message. Pre-existing app behaviour,
  left as-is.
- **The Account button is one control for both states.** Signed out it starts
  Google OAuth; signed in it offers to sign out via `confirm()`. The platform
  used to supply an account sheet here — this is the one piece of UI the port
  does not replace. See the note in `src/lib/auth.js`.
- **The bundle is ~500 kB** (~145 kB gzipped) and Vite warns about it. Fine for
  now; code-splitting the routes is the fix when it matters.
- **`vite.config.js` keeps two defensive transforms** from the platform template
  (see [Build notes](#build-notes)).

## License

No license file was included in the export. The application code is the author's.
