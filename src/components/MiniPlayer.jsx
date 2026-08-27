import { useNavigate } from 'react-router-dom'
import { Play, Pause, X, Hourglass } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'
import { useMembership } from '../hooks/useMembership'

function fmtShort(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmt(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function MiniPlayer() {
  const { track, isPlaying, remainingSec, totalSec, pause, resume, stop } = usePlayer()
  const { isMember, trialLeft } = useMembership()
  const navigate = useNavigate()

  if (!track) return null

  const pct = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0

  return (
    <div
      onClick={() => navigate('/session')}
      className="fixed left-0 right-0 z-20 cursor-pointer md:left-60
        bottom-[calc(56px+env(safe-area-inset-bottom,0px))] md:bottom-0"
    >
      <div className="mx-3 mb-2 md:mx-6 md:mb-6 rounded-2xl glass-card px-4 py-3 flex items-center gap-3 shadow-lg shadow-black/40">
        <div className="relative w-10 h-10 rounded-full border border-[rgb(212,175,120)]/50 flex items-center justify-center shrink-0">
          <span className="text-[9px] text-[rgb(212,175,120)] font-serif-elegant">{track.hz ? `${track.hz}Hz` : '♪'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{track.title}</p>
          {!isMember && (
            <p className="flex items-center gap-1 text-[rgb(212,175,120)]/75 text-[10px] mt-0.5">
              <Hourglass size={9} />
              <span className="font-mono">{fmtShort(trialLeft)}</span> free listening left
            </p>
          )}
          <div className="h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-[rgb(90,200,190)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="text-white/50 text-xs font-mono shrink-0 hidden sm:block">{fmt(remainingSec)}</span>
        <button
          onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : resume() }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); stop() }}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/50 shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
