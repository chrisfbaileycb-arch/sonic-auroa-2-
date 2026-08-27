import { useNavigate } from 'react-router-dom'
import { Play, ChevronRight } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'

export default function FrequencyCard({ freq }) {
  const navigate = useNavigate()
  const { start, track, isPlaying } = usePlayer()
  const isActive = track && track.id === freq.slug && isPlaying

  const handlePlay = (e) => {
    e.stopPropagation()
    start({ id: freq.slug, title: `${freq.hz}Hz \u2014 ${freq.name}`, hz: freq.hz }, 4)
  }

  return (
    <div
      onClick={() => navigate(`/track/${freq.slug}`)}
      className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-white/[0.09] transition-colors"
    >
      <button
        onClick={handlePlay}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
          isActive ? 'bg-[rgb(90,200,190)]/25 border-[rgb(90,200,190)]/60' : 'bg-white/5 border-white/15'
        }`}
      >
        <Play size={16} className={isActive ? 'text-[rgb(90,200,190)]' : 'text-white/80'} fill="currentColor" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-[15px] truncate">
          {freq.hz}Hz <span className="text-white/40">—</span> {freq.name}
        </p>
        <p className="text-white/45 text-xs truncate font-serif-elegant italic mt-0.5">{freq.tagline}</p>
      </div>
      <ChevronRight size={18} className="text-white/25 shrink-0" />
    </div>
  )
}
