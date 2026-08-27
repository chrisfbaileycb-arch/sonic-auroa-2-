import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * A rolling drop-down panel — tap the header and the content unrolls beneath it.
 */
export default function InsightPanel({ title, subtitle, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left"
      >
        {Icon && (
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
              open
                ? 'bg-[rgb(212,175,120)]/20 border-[rgb(212,175,120)]/50 text-[rgb(212,175,120)]'
                : 'bg-white/5 border-white/10 text-white/60'
            }`}
          >
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-white text-sm font-medium">{title}</span>
          {subtitle && (
            <span className="block text-white/35 text-[11px] font-serif-elegant italic mt-0.5">{subtitle}</span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`text-white/40 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-5 -mt-0.5 animate-panel">
          <div className="h-px bg-white/10 mb-4" />
          {children}
        </div>
      )}
    </div>
  )
}
