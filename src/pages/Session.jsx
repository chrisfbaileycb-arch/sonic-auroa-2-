import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, Square, ArrowLeft, RotateCcw, Sparkles, Minimize2, SlidersHorizontal, Moon, Sun } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'
import { useMembership } from '../hooks/useMembership'
import MemberLock from '../components/MemberLock'
import AmbientVisual from '../components/AmbientVisual'
import BlendPicker from '../components/BlendPicker'
import InsightPanel from '../components/InsightPanel'
import { AMBIENCE_MAP, MUSIC_MAP } from '../soundscapes'

function fmt(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const NIGHT_KEY = 'aurora.nightlight'

function loadNightPrefs() {
  try {
    const raw = localStorage.getItem(NIGHT_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return { on: p.on !== false, dim: typeof p.dim === 'number' ? p.dim : 0.5 }
    }
  } catch (e) {}
  return { on: true, dim: 0.5 }
}

/**
 * Slowly walks the clock block around the screen so a night-long session never
 * burns a fixed shape into an OLED panel.
 */
function useBurnInDrift(enabled) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (!enabled) { setPos({ x: 0, y: 0 }); return }
    const step = () => setPos({
      x: Math.round((Math.random() - 0.5) * 44),
      y: Math.round((Math.random() - 0.5) * 64),
    })
    const id = setInterval(step, 62000)
    return () => clearInterval(id)
  }, [enabled])
  return pos
}

function useClock(enabled) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

/** Keep the screen lit while the screensaver is up (where the browser allows it). */
function useWakeLock(enabled) {
  const lockRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    const request = async () => {
      try {
        if (!enabled || !navigator.wakeLock) return
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) { lock.release().catch(() => {}); return }
        lockRef.current = lock
      } catch (e) {}
    }
    request()
    const onVis = () => { if (document.visibilityState === 'visible') request() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      if (lockRef.current) { lockRef.current.release().catch(() => {}); lockRef.current = null }
    }
  }, [enabled])
}

export default function Session() {
  const {
    track, isPlaying, remainingSec, totalSec, durationHours,
    pause, resume, stop, lastSession, resumeLast,
    ambienceId, musicId, visualMode,
  } = usePlayer()
  const navigate = useNavigate()
  const { isMember, hasAccess, trialLeft, openUnlock } = useMembership()
  const [immersive, setImmersive] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [night, setNight] = useState(loadNightPrefs)
  const clock = useClock(immersive)
  const drift = useBurnInDrift(immersive)
  // the screensaver doubles as a nightlight, so the display stays lit while it is up
  useWakeLock(immersive)

  const saveNight = (next) => {
    setNight(next)
    try { localStorage.setItem(NIGHT_KEY, JSON.stringify(next)) } catch (e) {}
  }

  const openImmersive = () => {
    if (!hasAccess) { openUnlock('locked'); return }
    setShowControls(true)
    setImmersive(true)
  }

  // auto-hide the screensaver controls
  useEffect(() => {
    if (!immersive || !showControls) return
    const id = setTimeout(() => setShowControls(false), 5000)
    return () => clearTimeout(id)
  }, [immersive, showControls])

  useEffect(() => {
    if (!track) setImmersive(false)
  }, [track])

  if (!track) {
    return (
      <div className="pt-[env(safe-area-inset-top,0px)] h-full flex flex-col items-center justify-center text-center px-8">
        <button onClick={() => navigate('/')} className="absolute top-6 left-4 flex items-center gap-1 text-white/50 text-sm">
          <ArrowLeft size={18} /> Back
        </button>
        <p className="text-white/40 text-sm">No session is playing yet.</p>

        {lastSession && lastSession.trackId && lastSession.remainingSec > 60 && (
          <button
            onClick={resumeLast}
            className="mt-5 w-full max-w-xs glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
          >
            <span className="w-10 h-10 rounded-full bg-[rgb(90,200,190)]/20 border border-[rgb(90,200,190)]/55 text-[rgb(90,200,190)] flex items-center justify-center shrink-0">
              <RotateCcw size={16} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-white/45 text-[10px] uppercase tracking-[0.18em]">Resume</span>
              <span className="block text-white text-sm truncate">{lastSession.title}</span>
            </span>
          </button>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[rgb(90,200,190)]/15 border border-[rgb(90,200,190)]/50 text-[rgb(90,200,190)] text-sm"
        >
          Browse Frequencies
        </button>
      </div>
    )
  }

  const pct = totalSec > 0 ? ((totalSec - remainingSec) / totalSec) * 100 : 0
  const amb = AMBIENCE_MAP[ambienceId]
  const mus = MUSIC_MAP[musicId]
  const layerLine = [
    track.hz ? `${track.hz}Hz tone` : 'Your track',
    amb && amb.id !== 'none' ? amb.label : null,
    mus && mus.id !== 'none' ? mus.label : null,
  ].filter(Boolean).join('  ·  ')

  if (immersive) {
    const nightOn = night.on
    const dim = nightOn ? night.dim : 1
    return (
      <div
        className="fixed inset-0 z-40 bg-black overflow-hidden"
        onClick={() => setShowControls((v) => !v)}
      >
        <div
          className="absolute inset-0 transition-[filter] duration-700"
          style={{
            filter: nightOn
              ? `brightness(${(0.35 + dim * 0.65).toFixed(2)}) saturate(0.72) sepia(0.3) hue-rotate(-12deg)`
              : 'none',
          }}
        >
          <AmbientVisual mode={visualMode} dense={!nightOn} active={isPlaying} lowPower={nightOn} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55 pointer-events-none" />
        {/* nightlight dimmer */}
        <div
          className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-500"
          style={{ opacity: nightOn ? (1 - dim) * 0.88 : 0 }}
        />

        <div
          className="relative h-full flex flex-col items-center justify-center px-8 text-center transition-transform duration-[8000ms] ease-in-out"
          style={{
            transform: `translate(${drift.x}px, ${drift.y}px)`,
            opacity: nightOn ? 0.4 + dim * 0.6 : 1,
          }}
        >
          <p
            className="font-display text-[5rem] leading-none drop-shadow-lg"
            style={{ color: nightOn ? 'rgba(255,214,168,0.85)' : 'rgba(255,255,255,0.9)' }}
          >
            {clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
          <p className="text-white/55 text-sm mt-3 font-serif-elegant italic">{track.title}</p>
          <p className="text-white/30 text-[11px] mt-1">{layerLine}</p>
          <p className="text-white/45 text-xs font-mono mt-6">{fmt(remainingSec)} remaining</p>
          <div className="w-40 h-[3px] bg-white/10 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-[rgb(90,200,190)]/70" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Nightlight panel */}
        <div
          className={`absolute left-0 right-0 top-0 pt-[calc(env(safe-area-inset-top,0px)+1rem)] px-5 transition-opacity duration-500 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-sm mx-auto rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => saveNight({ ...night, on: !night.on })}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-[11px] transition-colors ${
                  nightOn
                    ? 'bg-[rgb(212,175,120)]/18 border-[rgb(212,175,120)]/55 text-[rgb(212,175,120)]'
                    : 'bg-white/5 border-white/15 text-white/55'
                }`}
              >
                {nightOn ? <Moon size={12} /> : <Sun size={12} />}
                {nightOn ? 'Nightlight' : 'Full bright'}
              </button>
              <input
                type="range"
                min="0.08"
                max="1"
                step="0.01"
                value={night.dim}
                disabled={!nightOn}
                onChange={(e) => saveNight({ ...night, dim: parseFloat(e.target.value) })}
                className="flex-1 h-1.5 appearance-none rounded-full bg-white/10 outline-none disabled:opacity-30"
                style={{ accentColor: 'rgb(212,175,120)' }}
              />
              <span className="text-white/35 text-[10px] font-mono w-8 text-right">
                {Math.round(night.dim * 100)}
              </span>
            </div>
            <p className="text-white/25 text-[10px] leading-relaxed mt-2">
              {nightOn
                ? 'Warm, low-blue and dimmed for sleeping. The clock drifts slowly to protect the screen.'
                : 'Full brightness and full detail.'}
            </p>
          </div>
        </div>

        <div
          className={`absolute left-0 right-0 bottom-0 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex items-center justify-center gap-5 transition-opacity duration-500 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); isPlaying ? pause() : resume() }}
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setImmersive(false) }}
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white"
          >
            <Minimize2 size={19} />
          </button>
        </div>

        {!showControls && (
          <p className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1.2rem)] left-0 right-0 text-center text-white/20 text-[10px]">
            tap anywhere for controls
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <AmbientVisual mode={visualMode} active={isPlaying} />
      </div>

      <div className="relative pt-[env(safe-area-inset-top,0px)] flex flex-col items-center px-6 max-w-md mx-auto w-full pb-10">
        <button onClick={() => navigate('/')} className="self-start mt-4 flex items-center gap-1 text-white/50 text-sm">
          <ArrowLeft size={18} /> Library
        </button>

        <div className="flex flex-col items-center w-full pt-6">
          <div className="relative w-60 h-60 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full border border-[rgb(212,175,120)]/30" />
            <div className={`absolute inset-4 rounded-full border border-[rgb(90,200,190)]/40 ${isPlaying ? 'animate-spin-slow' : ''}`} />
            <div className={`absolute inset-10 rounded-full bg-[rgb(90,200,190)]/10 ${isPlaying ? 'animate-slow-pulse' : ''}`} />
            <span className="font-display text-6xl text-white z-10">{track.hz ? `${track.hz}` : '♪'}</span>
            {track.hz && <span className="absolute bottom-12 text-white/40 text-xs tracking-widest z-10">HZ</span>}
          </div>

          <h2 className="text-white text-lg font-medium text-center px-4">{track.title}</h2>
          <p className="text-white/40 text-xs mt-1 font-serif-elegant italic">{durationHours}-hour continuous session</p>
          <p className="text-white/30 text-[11px] mt-2 text-center">{layerLine}</p>

          <div className="w-full mt-7">
            <div className="flex justify-between text-white/50 text-xs mb-2 font-mono">
              <span>{fmt(totalSec - remainingSec)}</span>
              <span>{fmt(remainingSec)} left</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[rgb(90,200,190)] to-[rgb(212,175,120)] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-6 mt-8">
            <button
              onClick={stop}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
            >
              <Square size={16} />
            </button>
            <button
              onClick={isPlaying ? pause : resume}
              className="w-16 h-16 rounded-full bg-[rgb(90,200,190)]/20 border border-[rgb(90,200,190)]/60 flex items-center justify-center text-[rgb(90,200,190)]"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button
              onClick={openImmersive}
              className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50"
              title="Screensaver"
            >
              <Sparkles size={16} />
            </button>
          </div>

          <button
            onClick={openImmersive}
            className="mt-4 text-[rgb(212,175,120)]/80 text-[11px] tracking-wide"
          >
            Enter screensaver &amp; nightlight
          </button>

          {!isMember && (
            <div className="w-full mt-5">
              {hasAccess ? (
                <div className="rounded-2xl border border-[rgb(212,175,120)]/25 bg-[rgb(212,175,120)]/[0.06] px-4 py-3 text-center">
                  <p className="text-[rgb(212,175,120)] text-[12.5px] font-medium">
                    {Math.floor(trialLeft / 60)}:{String(Math.floor(trialLeft % 60)).padStart(2, '0')} of free listening left
                  </p>
                  <p className="text-white/35 text-[11px] leading-relaxed mt-0.5">
                    Everything is open while your free half hour lasts.
                  </p>
                </div>
              ) : (
                <MemberLock
                  label="Your free listening is complete"
                  line="Members continue with all-night sessions, every soundscape, the screensaver and the nightlight."
                />
              )}
            </div>
          )}

          <div className="w-full mt-8">
            <InsightPanel
              title="Layer Desk"
              subtitle="Two channels: the frequency signal and the ambient bed"
              icon={SlidersHorizontal}
            >
              <BlendPicker toneLabel={track.hz ? 'Tone' : 'Track'} />
            </InsightPanel>
          </div>
        </div>

        <p className="text-white/25 text-[11px] text-center pt-8">
          Keep this app open in the background for uninterrupted playback.
        </p>
      </div>
    </div>
  )
}
