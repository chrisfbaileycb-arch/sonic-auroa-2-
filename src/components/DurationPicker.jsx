import { Lock } from 'lucide-react'
import { useMembership } from '../hooks/useMembership'

const OPTIONS = [
  { hours: 4, label: '4 hrs', sub: '1 block' },
  { hours: 8, label: '8 hrs', sub: '2 blocks' },
  { hours: 12, label: '12 hrs', sub: '3 blocks' },
]

export default function DurationPicker({ value, onChange }) {
  const { hasAccess, openUnlock } = useMembership()

  return (
    <div className="flex gap-2.5">
      {OPTIONS.map((opt) => {
        const locked = !hasAccess
        const active = value === opt.hours
        return (
          <button
            key={opt.hours}
            onClick={() => (locked ? openUnlock('locked') : onChange(opt.hours))}
            className={`flex-1 rounded-xl py-3 border text-center transition-colors relative ${
              active && !locked
                ? 'bg-[rgb(212,175,120)]/15 border-[rgb(212,175,120)]/60 text-[rgb(212,175,120)]'
                : locked
                  ? 'bg-white/[0.03] border-white/10 text-white/30'
                  : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            {locked && (
              <Lock size={10} className="absolute top-1.5 right-1.5 text-[rgb(212,175,120)]/60" />
            )}
            <div className="text-base font-semibold">{opt.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{opt.sub}</div>
          </button>
        )
      })}
    </div>
  )
}
