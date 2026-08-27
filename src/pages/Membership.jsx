import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Crown, Check, RefreshCw, ShieldCheck, Waves, Music4, Sparkles, Clock, CloudRain, Moon,
} from 'lucide-react'
import OwnerPanel from '../components/OwnerPanel'
import { payments } from '../lib/payments'
import { auth } from '../lib/auth'
import { useMembership, PRICE, TRIAL_MINUTES } from '../hooks/useMembership'

const APP_VERSION = '1.5'

const INCLUDED = [
  { icon: Clock, title: 'Full-length sessions', line: 'Continuous 4, 8 and 12-hour blocks that run all night.' },
  { icon: CloudRain, title: 'Every environment', line: 'Thunderstorms, rain, ocean, creek, forest, fireplace and noise beds.' },
  { icon: Music4, title: 'Instrumental beds', line: 'Piano, nocturne, ambient pad, drone, singing bowl and more — the tone layered over real music.' },
  { icon: Waves, title: 'Signature Blends', line: 'Curated one-tap combinations built around each frequency.' },
  { icon: Sparkles, title: 'Screensaver mode', line: 'Full-screen living artwork matched to your soundscape, screen kept awake.' },
  { icon: Moon, title: 'Nightlight', line: 'A warm, dimmable low-blue night display that can glow beside the bed all night.' },
  { icon: ShieldCheck, title: 'Everything to come', line: 'New frequencies, environments and paths are included as they arrive.' },
]

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return null
  }
}

export default function Membership() {
  const navigate = useNavigate()
  const { isMember, signedIn, renewsAt, loading, refresh, trialLeft, startCheckout } = useMembership()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const holdRef = useRef(null)

  // Quiet owner entry: hold the version line. Does nothing for anyone else.
  const startHold = () => {
    clearTimeout(holdRef.current)
    holdRef.current = setTimeout(() => {
      if (auth.isAppOwner()) setOwnerOpen(true)
    }, 800)
  }
  const endHold = () => clearTimeout(holdRef.current)
  useEffect(() => () => clearTimeout(holdRef.current), [])

  useEffect(() => {
    const result = payments.checkoutResult()
    if (result?.status === 'success') {
      setNote('Payment received — confirming your membership…')
      refresh()
    } else if (result?.status === 'canceled') {
      setNote('Checkout was cancelled. Nothing was charged.')
    }
  }, [refresh])

  const subscribe = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await startCheckout()
      if (res?.needsSignIn) {
        setNote('Sign in first so your membership follows you to every device, then tap Become a Member again.')
      }
    } catch (e) {
      if (e.code === 'NO_CONNECTION') {
        setError('Memberships are not open yet — the app owner still has to connect their payment account.')
      } else if (e.code === 'UNSUPPORTED') {
        setError('Yearly memberships need a card-based payment account. Please contact the app owner.')
      } else {
        setError(e.message || 'Checkout could not be opened. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const renew = fmtDate(renewsAt)

  return (
    <div className="pt-[env(safe-area-inset-top,0px)] max-w-2xl mx-auto w-full px-4 md:px-8 pb-16">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/60 pt-4 mb-5 text-sm">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Crest */}
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="relative w-24 h-24 rounded-full border border-[rgb(212,175,120)]/45 flex items-center justify-center mb-5">
          <div className="absolute inset-2 rounded-full border border-[rgb(90,200,190)]/30 animate-spin-slow" />
          <Crown size={30} className="text-[rgb(212,175,120)]" />
        </div>
        <h1 className="font-display text-5xl text-white leading-none">Membership</h1>
        <p className="text-white/45 text-sm mt-2 font-serif-elegant italic max-w-sm leading-relaxed">
          One key that opens the whole vessel — every environment, every bed, every hour of the night.
        </p>
      </div>

      {note && (
        <div className="glass-card rounded-2xl px-4 py-3 mt-5 text-[rgb(90,200,190)] text-[13px] leading-relaxed animate-panel">
          {note}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 mt-5 text-red-200/90 text-[13px] leading-relaxed animate-panel">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="glass-card rounded-2xl p-5 mt-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {loading ? (
          <p className="text-white/40 text-sm">Checking your membership…</p>
        ) : isMember ? (
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-full bg-[rgb(212,175,120)]/18 border border-[rgb(212,175,120)]/55 text-[rgb(212,175,120)] flex items-center justify-center shrink-0">
              <Crown size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-white text-[15px] font-medium">Active Annual Member</p>
              <p className="text-white/40 text-[12.5px] mt-1 leading-relaxed font-serif-elegant italic">
                {renew
                  ? `Your membership renews on ${renew}.`
                  : 'Every feature is unlocked. Thank you for keeping this alive.'}
              </p>
              <p className="text-white/30 text-[11.5px] mt-2 leading-relaxed">
                To change or cancel, use the receipt your payment provider emailed you — it carries
                the link to your billing details.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-6xl text-[rgb(212,175,120)] leading-none">$24.95</span>
              <span className="text-white/45 text-sm">/ year</span>
            </div>
            <p className="text-white/40 text-[12.5px] mt-2 leading-relaxed">
              About two dollars a month. It keeps the library growing and the app free of ads.
            </p>
            <p className="text-[rgb(90,200,190)]/85 text-[12px] mt-2.5 leading-relaxed">
              {trialLeft > 0
                ? `Free trial: ${Math.ceil(trialLeft / 60)} of your ${TRIAL_MINUTES} minutes remaining.`
                : 'Your free trial listening is complete.'}
            </p>
            <button
              onClick={subscribe}
              disabled={busy}
              className="w-full mt-4 rounded-2xl bg-[rgb(212,175,120)]/18 border border-[rgb(212,175,120)]/60 text-[rgb(212,175,120)] py-4 flex items-center justify-center gap-2 font-medium disabled:opacity-50"
            >
              <Crown size={17} /> {busy ? 'Opening checkout…' : 'Become a Member'}
            </button>
            <p className="text-white/30 text-[11px] text-center mt-2.5 leading-relaxed">
              {signedIn
                ? 'Renews yearly. Cancel any time from your payment receipt.'
                : 'You will be asked to sign in first so your membership works on every device.'}
            </p>
          </>
        )}

        <button
          onClick={refresh}
          className="w-full mt-4 flex items-center justify-center gap-1.5 text-white/40 text-[11.5px] py-2"
        >
          <RefreshCw size={12} /> Already paid? Restore my membership
        </button>
      </div>

      {/* Free tier honesty */}
      {!isMember && !loading && (
        <p className="text-white/35 text-[12px] leading-relaxed mt-4 text-center animate-fade-up" style={{ animationDelay: '0.14s' }}>
          Everyone gets {TRIAL_MINUTES} minutes of free listening with every feature open — blends,
          soundscapes and mixing included. The library, the written guidance and the Attunement stay
          free to read for good.
        </p>
      )}

      {/* Included */}
      <div className="mt-8 space-y-2.5">
        <p className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-3">What a membership opens</p>
        {INCLUDED.map(({ icon: Icon, title, line }, i) => (
          <div
            key={title}
            className="glass-card rounded-2xl p-4 flex items-start gap-3 animate-fade-up"
            style={{ animationDelay: `${0.18 + i * 0.05}s` }}
          >
            <span className="w-9 h-9 rounded-full bg-[rgb(90,200,190)]/12 border border-[rgb(90,200,190)]/40 text-[rgb(90,200,190)] flex items-center justify-center shrink-0">
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-white text-[13.5px] font-medium flex items-center gap-1.5">
                {title}
                <Check size={12} className="text-[rgb(212,175,120)]" />
              </p>
              <p className="text-white/40 text-[12px] leading-relaxed mt-0.5">{line}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-white/25 text-[11px] text-center pt-8 leading-relaxed">
        Payment is handled by the app owner's own payment provider — SonicAurora never sees your card details.
      </p>

      {/* About */}
      <div className="mt-8 pt-6 border-t border-white/10 text-center">
        <p className="text-white/45 text-[10px] uppercase tracking-[0.2em]">About</p>
        <p className="font-display text-4xl text-white/80 mt-2 leading-none">SonicAurora</p>
        <p
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onContextMenu={(e) => e.preventDefault()}
          className="text-white/25 text-[11px] mt-2 select-none inline-block px-3 py-1"
        >
          Version {APP_VERSION}
        </p>
        <p className="text-white/20 text-[10.5px] leading-relaxed mt-1 max-w-xs mx-auto">
          A wellness tool for relaxation and meditation. Not a substitute for medical care.
        </p>
      </div>

      {ownerOpen && <OwnerPanel onClose={() => setOwnerOpen(false)} />}
    </div>
  )
}
