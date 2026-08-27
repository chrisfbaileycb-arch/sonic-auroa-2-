import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, BookOpen, Compass, ListOrdered, SlidersHorizontal,
} from 'lucide-react'
import { useLiveShared } from '../lib/useLive'
import { usePlayer } from '../hooks/usePlayer'
import { useMembership } from '../hooks/useMembership'
import MemberLock from '../components/MemberLock'
import DurationPicker from '../components/DurationPicker'
import InsightPanel from '../components/InsightPanel'
import BlendPicker from '../components/BlendPicker'
import { INTENT_MAP } from '../intents'
import { AMBIENCE_MAP, MUSIC_MAP } from '../soundscapes'

export default function FrequencyDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: frequencies } = useLiveShared('frequencies', { limit: 100 })
  const freq = (frequencies || []).find((f) => f.slug === slug)

  const { start, track, isPlaying, pause, resume, ambienceId, musicId } = usePlayer()
  const { isMember, hasAccess, trialLeft } = useMembership()

  const [hours, setHours] = useState(4)

  const isThisPlaying = track && track.id === slug

  if (!freq) {
    return (
      <div className="p-6 text-white/40 text-sm">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-white/60">
          <ArrowLeft size={18} /> Back
        </button>
        Loading…
      </div>
    )
  }

  const runHours = hours
  const runLabel = `${runHours}hr`

  const handlePlayToggle = () => {
    if (isThisPlaying) {
      isPlaying ? pause() : resume()
    } else {
      start(
        { id: slug, title: `${freq.hz}Hz — ${freq.name}`, hz: freq.hz },
        runHours
      )
    }
  }

  const tags = (freq.intents || []).map((k) => INTENT_MAP[k]).filter(Boolean)
  const plan = Array.isArray(freq.plan) ? freq.plan : []

  return (
    <div className="pt-[env(safe-area-inset-top,0px)] max-w-2xl mx-auto w-full px-4 md:px-8 pb-12">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/60 pt-4 mb-4 text-sm">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Halo */}
      <div className="flex flex-col items-center text-center animate-fade-up">
        <div className="relative w-40 h-40 rounded-full border border-[rgb(212,175,120)]/40 flex items-center justify-center mb-5">
          <div className="absolute inset-3 rounded-full border border-[rgb(90,200,190)]/30 animate-spin-slow" />
          <span className="font-display text-5xl text-[rgb(212,175,120)]">{freq.hz}</span>
          <span className="absolute bottom-6 text-white/40 text-xs tracking-widest">HZ</span>
        </div>
        <h1 className="text-white text-2xl font-semibold">{freq.name}</h1>
        <p className="text-[rgb(90,200,190)] text-sm font-serif-elegant italic mt-1">{freq.tagline}</p>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 animate-fade-up" style={{ animationDelay: '0.08s' }}>
          {tags.map(({ key, label, icon: Icon }) => (
            <span
              key={key}
              className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-white/60 text-[11px]"
            >
              <Icon size={12} /> {label}
            </span>
          ))}
        </div>
      )}

      <p className="text-white/60 text-sm leading-relaxed mt-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {freq.benefits}
      </p>

      {/* Session controls */}
      <div className="mt-7 animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <p className="text-white/50 text-xs uppercase tracking-widest mb-2.5">Session Length</p>
        <DurationPicker value={runHours} onChange={setHours} />
      </div>

      <button
        onClick={handlePlayToggle}
        className="w-full mt-5 rounded-2xl bg-[rgb(90,200,190)]/15 border border-[rgb(90,200,190)]/50 text-[rgb(90,200,190)] py-4 flex items-center justify-center gap-2 font-medium animate-fade-up"
        style={{ animationDelay: '0.2s' }}
      >
        {isThisPlaying && isPlaying ? <Pause size={18} /> : <Play size={18} />}
        {isThisPlaying && isPlaying ? 'Pause Session' : `Play ${runLabel} Session`}
      </button>
      <p className="text-white/30 text-[11px] text-center mt-2">
        {[
          `Pure ${freq.hz}Hz tone`,
          AMBIENCE_MAP[ambienceId] && ambienceId !== 'none' ? AMBIENCE_MAP[ambienceId].label : null,
          MUSIC_MAP[musicId] && musicId !== 'none' ? MUSIC_MAP[musicId].label : null,
        ].filter(Boolean).join('  ·  ')}
      </p>

      {!isMember && (
        <div className="mt-4 animate-fade-up" style={{ animationDelay: '0.22s' }}>
          {hasAccess ? (
            <div className="rounded-2xl border border-[rgb(212,175,120)]/25 bg-[rgb(212,175,120)]/[0.06] px-4 py-3 text-center">
              <p className="text-[rgb(212,175,120)] text-[12.5px] font-medium">
                {Math.ceil(trialLeft / 60)} free minutes left — everything is open
              </p>
              <p className="text-white/35 text-[11px] leading-relaxed mt-0.5">
                Explore any tone, blend or soundscape while your free half hour lasts.
              </p>
            </div>
          ) : (
            <MemberLock
              label="Your free listening is complete"
              line="Members continue with 4, 8 and 12-hour blocks, every soundscape and the nightlight."
            />
          )}
        </div>
      )}

      {/* Rolling detail panels */}
      <div className="mt-8 space-y-3 animate-fade-up" style={{ animationDelay: '0.25s' }}>
        <InsightPanel
          title="Build Your Blend"
          subtitle="Layer this tone with weather, water and instrumental music"
          icon={SlidersHorizontal}
        >
          <BlendPicker toneLabel="Tone" />
        </InsightPanel>

        <InsightPanel
          title="The Full Picture"
          subtitle="What this frequency does, and how it is used"
          icon={BookOpen}
          defaultOpen
        >
          <p className="text-white/60 text-[13.5px] leading-[1.75]">{freq.deep}</p>
        </InsightPanel>

        <InsightPanel
          title="Sync With Your True Self"
          subtitle="The inner work this tone supports"
          icon={Compass}
        >
          <p className="text-white/60 text-[13.5px] leading-[1.75]">{freq.trueSelf}</p>
        </InsightPanel>

        {plan.length > 0 && (
          <InsightPanel
            title="Your Practice Plan"
            subtitle={`${plan.length} steps to follow`}
            icon={ListOrdered}
          >
            <ol className="space-y-3.5">
              {plan.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/40 text-[rgb(212,175,120)] text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-white/60 text-[13.5px] leading-[1.7]">{step}</span>
                </li>
              ))}
            </ol>
          </InsightPanel>
        )}
      </div>
    </div>
  )
}
