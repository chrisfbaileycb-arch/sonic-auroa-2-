import { Crown, Lock } from 'lucide-react'
import { useMembership } from '../hooks/useMembership'

/**
 * The single "members only" surface used everywhere a locked feature appears.
 *
 *  variant="bar"     — a slim inline row under/above the locked control
 *  variant="overlay" — sits over a dimmed preview of the feature itself
 */
export default function MemberLock({ label, line, variant = 'bar' }) {
  const { openUnlock } = useMembership()

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-10 rounded-2xl bg-[#070d14]/70 backdrop-blur-[3px] flex flex-col items-center justify-center text-center px-6">
        <span className="w-11 h-11 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/55 text-[rgb(212,175,120)] flex items-center justify-center">
          <Lock size={17} />
        </span>
        <p className="text-white text-[13.5px] font-medium mt-3">{label}</p>
        {line && <p className="text-white/40 text-[11.5px] leading-relaxed mt-1 max-w-[16rem]">{line}</p>}
        <button
          onClick={() => openUnlock('locked')}
          className="mt-4 rounded-xl bg-[rgb(212,175,120)]/18 border border-[rgb(212,175,120)]/60 text-[rgb(212,175,120)] px-4 py-2.5 text-xs font-medium flex items-center gap-1.5"
        >
          <Crown size={13} /> Unlock — $24.95 / year
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => openUnlock('locked')}
      className="w-full rounded-2xl border border-[rgb(212,175,120)]/35 bg-[rgb(212,175,120)]/[0.07] px-4 py-3 flex items-center gap-3 text-left hover:bg-[rgb(212,175,120)]/[0.12] transition-colors"
    >
      <span className="w-8 h-8 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/50 text-[rgb(212,175,120)] flex items-center justify-center shrink-0">
        <Lock size={14} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-white text-[12.5px] font-medium">{label}</span>
        {line && <span className="block text-white/40 text-[11px] leading-snug mt-0.5">{line}</span>}
      </span>
      <span className="text-[rgb(212,175,120)] text-[11px] font-medium shrink-0">Unlock</span>
    </button>
  )
}
