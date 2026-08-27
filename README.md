# SonicAura

A layered sound-therapy app. A listener picks an *intention*, gets matched to a healing
frequency, and plays it over an environment (rain, ocean, forest, fire) and an
instrumental bed — three audio layers running at once, for a chosen duration, with a
moving ambient visual behind it.

React 18 + Vite 5 + Tailwind, built as a mobile-first PWA.

## Status

This repository is the single source of truth for the SonicAura codebase. Its initial
commit is a faithful, unmodified import of the Whacka export
(`sonicaura1hk7.zip`) — see [WHACKA-EXPORT.md](WHACKA-EXPORT.md) for the original
export notice.

**It does not build and run standalone as-is.** Everything under `src/lib/` is a stub;
the real implementations (data, auth, storage, payments, realtime) run on the Whacka
platform and are injected at runtime. To run this outside Whacka, those stubs need real
backing services. See [Running it standalone](#running-it-standalone).

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

## The `src/lib/` stubs

Each file is ~20 lines and exists only to keep imports resolving and to document which
platform APIs the app depends on:

| Stub | Provides |
| --- | --- |
| `db.js`, `useLive.js`, `_realtime-share.js` | Data reads/writes and live subscriptions |
| `auth.js`, `auth-modal.js`, `user.js`, `_platform-auth.js`, `_oauth-return.js` | Session, sign-in, Google OAuth return |
| `payments.js`, `credits-gate.js`, `_gate.js` | Purchases and entitlement gating |
| `audio.js` | Platform audio helpers |
| `_supabase-token.js` | Realtime token minting |
| `_headers.js`, `_rate-limit.js`, `_read-resilience.js`, `_read-notice.js`, `_write-notice.js` | Request plumbing and failure UX |
| `_host-bridge.js`, `_embed-shims.js`, `_branding.js`, `_client-report.js` | Host iframe bridge, branding, error reporting |

Replacing these is the bulk of the work in taking this app off-platform.

## Running it standalone

```bash
npm install
npm run dev      # vite dev server
npm run build    # production build to dist/
npm run preview
```

`npm run dev` will start and the UI will render, but any path touching a stub
(sign-in, membership, saved sessions, remote audio) is inert until backed by a real
implementation. `@supabase/supabase-js` is already a dependency, so Supabase is the
shortest route to filling in `db.js`, `auth.js` and `_supabase-token.js`.

Audio assets are referenced by absolute URL against Whacka storage
(see `STORM_URL` in `src/soundscapes.js`); those need rehosting too.

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

## Known leftovers from the export

Carried over verbatim from the template; not fixed here so the initial commit stays a
clean import:

- `package.json` `name` is `whacka-pwa-template`.
- `index.html` `<title>` is `My App`; `theme-color` is the template default `#3B82F6`.
- `/manifest.json` and `/apple-touch-icon.png` are referenced but not present in the export.
- `package.json` lists `phaser`, `leaflet`, `react-leaflet`, `qrcode.react` and
  `date-fns` — template defaults nothing in `src/` imports.

## License

No license file was included in the export. The application code is the author's; the
Whacka platform SDK and backend are not part of this repository.
