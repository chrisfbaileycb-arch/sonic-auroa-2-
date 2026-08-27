import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, RotateCcw, X, Compass, ArrowRight, Layers, Crown, Lock } from 'lucide-react'
import { useLiveShared, useLive } from '../lib/useLive'
import FrequencyCard from '../components/FrequencyCard'
import { usePlayer } from '../hooks/usePlayer'
import { useMembership } from '../hooks/useMembership'
import { INTENTS } from '../intents'
import { BLENDS } from '../blends'
import { AMBIENCE_MAP, MUSIC_MAP } from '../soundscapes'

const HERO_IMG = 'https://api.whacka.app/storage/v1/object/public/app-images/projects/26968d4c-998e-421c-aca2-861653b930c9/gen-bc7092a7-1785390905571.png'

function fmtRemaining(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  if (h <= 0) return `${m} min left`
  return `${h}h ${String(m).padStart(2, '0')}m left`
}

export default function Home() {
  const { data: frequencies, loading } = useLiveShared('frequencies', { limit: 100 })
  const { data: profiles } = useLive('auraProfile')
  const profile = (profiles || [])[0] || null
  const [query, setQuery] = useState('')
  const [intent, setIntent] = useState(null)
  const navigate = useNavigate()
  const { lastSession, resumeLast, forgetLast, track, start } = usePlayer()
  const { isMember, hasAccess, trialLeft, openUnlock } = useMembership()

  const primaryFreq = (frequencies || []).find((f) => f.slug === profile?.primary)

  const startBlend = (b) => {
    if (!hasAccess) { openUnlock('expired'); return }
    const f = (frequencies || []).find((x) => x.slug === b.slug)
    if (!f) return
    start(
      { id: f.slug, title: `${f.hz}Hz \u2014 ${f.name}`, hz: f.hz },
      b.hours,
      { ambience: b.ambience, music: b.music }
    )
    navigate('/session')
  }

  const groups = useMemo(() => {
    const list = (frequencies || []).filter((f) => {
      if (intent && !(f.intents || []).includes(intent)) return false
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        String(f.hz).includes(q) ||
        f.name?.toLowerCase().includes(q) ||
        f.tagline?.toLowerCase().includes(q) ||
        f.benefits?.toLowerCase().includes(q)
      )
    }).sort((a, b) => a.hz - b.hz)

    const byCat = {}
    for (const f of list) {
      const cat = f.category || 'Frequencies'
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push(f)
    }
    return byCat
  }, [frequencies, query, intent])

  const activeIntent = INTENTS.find((i) => i.key === intent)
  const showResume = !track && lastSession && lastSession.trackId && lastSession.remainingSec > 60

  return (
    <div className="pt-[env(safe-area-inset-top,0px)]">
      {/* Hero */}
      <div className="relative h-72 md:h-80 overflow-hidden">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070d14]/40 to-[#070d14]" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 px-4">
          <h1 className="font-display text-6xl md:text-7xl text-white drop-shadow-lg animate-fade-up">SonicAurora</h1>
          <p className="text-white/70 text-sm mt-1 font-serif-elegant italic animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Verified Solfeggio &amp; Healing Frequencies
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 md:px-8 -mt-6 relative z-10">
        {/* Resume where you left off */}
        {showResume && (
          <div className="glass-card rounded-2xl p-4 mb-4 flex items-center gap-3 animate-fade-up">
            <button
              onClick={resumeLast}
              className="w-11 h-11 rounded-full bg-[rgb(90,200,190)]/20 border border-[rgb(90,200,190)]/55 text-[rgb(90,200,190)] flex items-center justify-center shrink-0"
            >
              <RotateCcw size={17} />
            </button>
            <div className="flex-1 min-w-0" onClick={resumeLast} role="button">
              <p className="text-white/45 text-[10px] uppercase tracking-[0.18em]">Pick up where you left off</p>
              <p className="text-white text-sm font-medium truncate mt-0.5">{lastSession.title}</p>
              <p className="text-white/40 text-[11px] font-serif-elegant italic">
                {fmtRemaining(lastSession.remainingSec)}
              </p>
            </div>
            <button onClick={forgetLast} className="text-white/30 shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Membership */}
        <button
          onClick={() => navigate('/membership')}
          className={`w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left animate-fade-up transition-colors ${
            isMember
              ? 'glass-card'
              : 'border border-[rgb(212,175,120)]/35 bg-[rgb(212,175,120)]/[0.07] hover:bg-[rgb(212,175,120)]/[0.12]'
          }`}
          style={{ animationDelay: '0.1s' }}
        >
          <span className="w-11 h-11 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/50 text-[rgb(212,175,120)] flex items-center justify-center shrink-0">
            <Crown size={18} />
          </span>
          <span className="flex-1 min-w-0">
            {isMember ? (
              <>
                <span className="block text-white/45 text-[10px] uppercase tracking-[0.18em]">Membership</span>
                <span className="block text-white text-sm font-medium mt-0.5">
                  Everything unlocked
                </span>
                <span className="block text-white/35 text-[11px] font-serif-elegant italic">
                  The whole vessel is open to you
                </span>
              </>
            ) : (
              <>
                <span className="block text-white text-sm font-medium">
                  {trialLeft > 0
                    ? `${Math.ceil(trialLeft / 60)} free minutes remaining`
                    : 'Your free listening is complete'}
                </span>
                <span className="block text-white/40 text-[11px] font-serif-elegant italic mt-0.5">
                  All-night sessions, every soundscape and blend — $24.95 a year
                </span>
              </>
            )}
          </span>
          <ArrowRight size={16} className="text-white/30 shrink-0" />
        </button>

        {/* Attunement */}
        <button
          onClick={() => navigate('/attune')}
          className="w-full glass-card rounded-2xl p-4 mb-4 flex items-center gap-3 text-left animate-fade-up"
          style={{ animationDelay: '0.12s' }}
        >
          <span className="w-11 h-11 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/50 text-[rgb(212,175,120)] flex items-center justify-center shrink-0">
            <Compass size={18} />
          </span>
          <span className="flex-1 min-w-0">
            {profile && primaryFreq ? (
              <>
                <span className="block text-white/45 text-[10px] uppercase tracking-[0.18em]">Your attunement</span>
                <span className="block text-white text-sm font-medium truncate mt-0.5">
                  {primaryFreq.hz}Hz · {primaryFreq.name}
                </span>
                <span className="block text-white/35 text-[11px] font-serif-elegant italic">
                  {profile.hours}-hour sessions · seven-day path inside
                </span>
              </>
            ) : (
              <>
                <span className="block text-white text-sm font-medium">Find your frequency</span>
                <span className="block text-white/35 text-[11px] font-serif-elegant italic mt-0.5">
                  An eight-question attunement, then a path to follow
                </span>
              </>
            )}
          </span>
          <ArrowRight size={16} className="text-white/30 shrink-0" />
        </button>

        {/* Search */}
        <div className="glass-card rounded-2xl flex items-center gap-2.5 px-4 py-3 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <Search size={18} className="text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search frequency, name, or benefit..."
            className="bg-transparent outline-none text-white text-sm placeholder-white/30 flex-1"
          />
        </div>

        {/* Intention chooser */}
        <div className="mt-5 animate-fade-up" style={{ animationDelay: '0.18s' }}>
          <p className="text-white/45 text-[10px] uppercase tracking-[0.2em] mb-2.5">What do you need today?</p>
          <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
            {INTENTS.map(({ key, label, icon: Icon }) => {
              const on = intent === key
              return (
                <button
                  key={key}
                  onClick={() => setIntent(on ? null : key)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 border text-xs transition-colors ${
                    on
                      ? 'bg-[rgb(212,175,120)]/18 border-[rgb(212,175,120)]/60 text-[rgb(212,175,120)]'
                      : 'bg-white/5 border-white/10 text-white/55 hover:bg-white/10'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              )
            })}
          </div>
          {activeIntent && (
            <p className="text-white/40 text-xs font-serif-elegant italic mt-2 animate-panel">
              {activeIntent.line}
            </p>
          )}
        </div>

        {/* Blends */}
        <div className="mt-6 animate-fade-up" style={{ animationDelay: '0.19s' }}>
          <div className="flex items-center gap-2 mb-2.5">
            <Layers size={14} className="text-[rgb(212,175,120)]" />
            <h2 className="text-white/70 text-xs uppercase tracking-[0.2em] font-medium">Signature Blends</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {BLENDS.map((b) => {
              const amb = AMBIENCE_MAP[b.ambience]
              const mus = MUSIC_MAP[b.music]
              const Icon = amb?.icon
              return (
                <button
                  key={b.id}
                  onClick={() => startBlend(b)}
                  className="shrink-0 w-[212px] glass-card rounded-2xl p-4 text-left hover:bg-white/[0.09] transition-colors relative"
                >
                  {!hasAccess && (
                    <Lock size={11} className="absolute top-3 right-3 text-[rgb(212,175,120)]/70" />
                  )}
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={15} className="text-[rgb(90,200,190)]" />}
                    <span className="font-display text-3xl text-white leading-none">{b.name}</span>
                  </div>
                  <p className="text-white/45 text-[11px] leading-snug mt-2 h-8 overflow-hidden">{b.line}</p>
                  <p className="text-[rgb(212,175,120)]/80 text-[10px] mt-2 truncate">
                    {b.slug}Hz · {amb?.label} · {mus?.label}
                  </p>
                  <p className="text-white/25 text-[10px] mt-0.5">{b.hours}-hour session</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Lists */}
        <div className="mt-7 space-y-8 pb-6">
          {loading && (
            <p className="text-white/40 text-sm text-center py-10">Loading frequencies…</p>
          )}
          {!loading && Object.keys(groups).length === 0 && (
            <p className="text-white/40 text-sm text-center py-10">
              Nothing matches that yet — try another intention or search term.
            </p>
          )}
          {Object.entries(groups).map(([cat, items], gi) => (
            <div key={cat} className="animate-fade-up" style={{ animationDelay: `${0.25 + gi * 0.05}s` }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-[rgb(212,175,120)]" />
                <h2 className="text-white/70 text-xs uppercase tracking-[0.2em] font-medium">{cat}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((f) => (
                  <FrequencyCard key={f.slug} freq={f} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-white/25 text-[11px] text-center pb-6 leading-relaxed">
          These frequencies are used within sound therapy and meditation traditions.
          They are a wellness tool for relaxation and are not a substitute for medical care.
        </p>
      </div>
    </div>
  )
}
