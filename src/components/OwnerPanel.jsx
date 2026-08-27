import { useEffect, useState } from 'react'
import { X, ShieldCheck, RefreshCw, CreditCard, UserRound } from 'lucide-react'
import { payments } from '../lib/payments'
import { useMembership } from '../hooks/useMembership'

/**
 * Quiet admin-only sheet, reached by holding the version line in About.
 * It never appears for a normal listener — the trigger simply does nothing.
 * Deliberately shows no personal name — just "Admin" — even though access
 * is still gated to the app owner's own sign-in behind the scenes.
 */
export default function OwnerPanel({ onClose }) {
  const { refresh } = useMembership()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    payments.status()
      .then((s) => { if (alive) setStatus(s) })
      .catch(() => { if (alive) setStatus({ error: true }) })
    return () => { alive = false }
  }, [])

  const recheck = async () => {
    setBusy(true)
    try { await refresh() } finally { setBusy(false) }
  }

  const checkoutLine = status === null
    ? 'Checking your payment connection…'
    : status.error
      ? 'Could not read the payment connection right now.'
      : status.available
        ? 'Connected — members can be charged the yearly fee.'
        : 'Not connected yet — the Become a Member button will explain that memberships are not open.'

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center px-4"
      style={{ height: 'var(--visual-height, 100dvh)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl md:rounded-3xl bg-[#0a1119] border border-white/10 p-5 overflow-y-auto"
        style={{ maxHeight: 'calc(var(--visual-height, 100dvh) - 3rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/50 text-[rgb(212,175,120)] flex items-center justify-center">
              <ShieldCheck size={16} />
            </span>
            <div>
              <p className="text-white text-sm font-medium">Sub Admin Portal</p>
              <p className="text-white/35 text-[11px]">Only you can open this.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/35 shrink-0 p-1">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 flex items-start gap-3">
            <UserRound size={15} className="text-[rgb(90,200,190)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-white/70 text-[12.5px]">Access level</p>
              <p className="text-white text-[12.5px] truncate">Admin</p>
              <p className="text-white/35 text-[11px] leading-relaxed mt-1">
                Every member feature is open to you without a subscription.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 flex items-start gap-3">
            <CreditCard size={15} className="text-[rgb(212,175,120)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-white/70 text-[12.5px]">Yearly membership · $24.95</p>
              <p className="text-white/40 text-[11.5px] leading-relaxed mt-1">{checkoutLine}</p>
            </div>
          </div>

          <button
            onClick={recheck}
            disabled={busy}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 flex items-center justify-center gap-2 text-white/60 text-[12.5px] disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Re-checking…' : 'Re-check entitlements'}
          </button>
        </div>

        <p className="text-white/25 text-[10.5px] leading-relaxed mt-4">
          Payments settle straight into your own connected account. This panel only reads
          status — nothing here changes anyone's membership.
        </p>
      </div>
    </div>
  )
}
