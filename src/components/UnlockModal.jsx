import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, X, Check, Clock, SlidersHorizontal, Compass } from 'lucide-react'
import { useMembership, PRICE, TRIAL_MINUTES } from '../hooks/useMembership'

const POINTS = [
  { icon: Clock, text: 'Unlimited 4, 8 and 12-hour sessions' },
  { icon: SlidersHorizontal, text: 'Custom frequency mixing and every soundscape' },
  { icon: Compass, text: 'Seven-day attunement protocols' },
]

/**
 * The single gate that appears when the free trial is spent — and whenever a
 * locked control is tapped afterwards.
 */
export default function UnlockModal() {
  const navigate = useNavigate()
  const { unlockReason, closeUnlock, startCheckout } = useMembership()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [note, setNote] = useState(null)

  if (!unlockReason) return null

  const go = async () => {
    setError(null)
    setBusy(true)
    try {
      const res = await startCheckout()
      if (res?.needsSignIn) {
        setNote('Sign in first so your membership follows you to every device, then tap again.')
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

  const expired = unlockReason === 'expired'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
      style={{ height: 'var(--visual-height, 100dvh)' }}
      onClick={closeUnlock}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl border border-[rgb(212,175,120)]/25 bg-[#0a121b] px-6 pt-7 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] md:pb-7 overflow-y-auto animate-panel"
        style={{ maxHeight: 'calc(var(--visual-height, 100dvh) - 2rem)' }}
      >
        <button
          onClick={closeUnlock}
          className="absolute right-5 top-5 text-white/35 md:hidden"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative w-16 h-16 rounded-full border border-[rgb(212,175,120)]/45 flex items-center justify-center mb-4">
            <div className="absolute inset-1.5 rounded-full border border-[rgb(90,200,190)]/25 animate-spin-slow" />
            <Crown size={22} className="text-[rgb(212,175,120)]" />
          </div>

          {expired && (
            <p className="text-[rgb(90,200,190)]/80 text-[10px] uppercase tracking-[0.22em] mb-2">
              Your {TRIAL_MINUTES} free minutes are complete
            </p>
          )}

          <h2 className="font-display text-4xl text-white leading-tight">
            Unlock Full SonicAurora Access
          </h2>
          <p className="text-white/45 text-[12.5px] leading-relaxed mt-2 font-serif-elegant italic max-w-xs">
            Unlimited 12-hour sessions, custom frequency mixing, and 7-day attunement protocols.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {POINTS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5">
              <span className="w-7 h-7 rounded-full bg-[rgb(90,200,190)]/12 border border-[rgb(90,200,190)]/40 text-[rgb(90,200,190)] flex items-center justify-center shrink-0">
                <Icon size={13} />
              </span>
              <span className="text-white/75 text-[12.5px] leading-snug flex-1">{text}</span>
              <Check size={13} className="text-[rgb(212,175,120)] shrink-0" />
            </div>
          ))}
        </div>

        {note && (
          <p className="text-[rgb(90,200,190)] text-[12px] leading-relaxed mt-4 text-center">{note}</p>
        )}
        {error && (
          <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 mt-4 text-red-200/90 text-[12px] leading-relaxed">
            {error}
          </p>
        )}

        <button
          onClick={go}
          disabled={busy}
          className="w-full mt-5 rounded-2xl bg-[rgb(212,175,120)]/18 border border-[rgb(212,175,120)]/60 text-[rgb(212,175,120)] py-4 flex items-center justify-center gap-2 font-medium disabled:opacity-50"
        >
          <Crown size={16} />
          {busy ? 'Opening checkout…' : `Start Annual Membership — $${PRICE.toFixed(2)}/year`}
        </button>

        <button
          onClick={() => { closeUnlock(); navigate('/membership') }}
          className="w-full mt-2 text-white/45 text-[12px] py-2.5"
        >
          See everything a membership opens
        </button>
        <button onClick={closeUnlock} className="w-full text-white/25 text-[11.5px] py-1.5">
          Not now
        </button>
      </div>
    </div>
  )
}
