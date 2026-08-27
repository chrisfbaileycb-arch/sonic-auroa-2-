import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Compass, Play, RefreshCw, Sparkles, Layers, CalendarDays,
} from 'lucide-react'
import { useLive, useLiveShared } from '../lib/useLive'
import { db } from '../lib/db'
import { auth } from '../lib/auth'
import { usePlayer } from '../hooks/usePlayer'
import { INTENTS, INTENT_MAP } from '../intents'
import { AMBIENCE_MAP, MUSIC_MAP } from '../soundscapes'

const PROFILE_ID = 'me'

const QUESTIONS = [
  {
    key: 'focus',
    multi: true,
    max: 3,
    title: 'What are you here for?',
    hint: 'Choose up to three.',
    options: INTENTS.map((i) => ({ value: i.key, label: i.label, sub: i.line })),
  },
  {
    key: 'seat',
    title: 'Where do you feel it most?',
    hint: 'The place the weight sits right now.',
    options: [
      { value: 'body', label: 'In my body', sub: 'Pain, tension, illness, fatigue' },
      { value: 'mind', label: 'In my mind', sub: 'Racing thoughts, fog, overwhelm' },
      { value: 'heart', label: 'In my heart', sub: 'Grief, anger, loneliness, love withheld' },
      { value: 'spirit', label: 'In my spirit', sub: 'Disconnected, drifting, far from God' },
      { value: 'drained', label: 'Everywhere at once', sub: 'Simply worn all the way down' },
    ],
  },
  {
    key: 'sleep',
    title: 'How has your sleep been?',
    options: [
      { value: 'poor', label: 'I barely sleep', sub: 'Hours awake before I go under' },
      { value: 'broken', label: 'Broken', sub: 'I wake through the night' },
      { value: 'fine', label: 'Mostly fine', sub: 'Sleep is not the problem' },
    ],
  },
  {
    key: 'stress',
    title: 'How loud is the pressure?',
    hint: 'One is still water. Five is a storm.',
    options: [
      { value: '1', label: '1 · Still', sub: 'Steady and settled' },
      { value: '2', label: '2 · Ripples', sub: 'Manageable' },
      { value: '3', label: '3 · Choppy', sub: 'Carrying more than I want to' },
      { value: '4', label: '4 · Heavy', sub: 'It follows me into the night' },
      { value: '5', label: '5 · Storm', sub: 'I need relief now' },
    ],
  },
  {
    key: 'faith',
    title: 'Do you keep a spiritual practice?',
    hint: 'There is no wrong answer here.',
    options: [
      { value: 'daily', label: 'Daily prayer or devotion', sub: 'Sound joins something already alive' },
      { value: 'sometimes', label: 'Now and then', sub: 'I reach out when I need to' },
      { value: 'searching', label: 'I am searching', sub: 'Something is calling and I want to hear it' },
      { value: 'secular', label: 'Keep it non-religious', sub: 'I want the wellness, not the doctrine' },
    ],
  },
  {
    key: 'when',
    title: 'When will you actually listen?',
    options: [
      { value: 'sleep', label: 'Falling asleep', sub: 'Through the night, low in the room' },
      { value: 'allnight', label: 'All night, every night', sub: 'Twelve-hour blocks' },
      { value: 'work', label: 'While I work or study', sub: 'Under everything else' },
      { value: 'meditate', label: 'In prayer or meditation', sub: 'Set apart, eyes closed' },
      { value: 'pain', label: 'When pain flares', sub: 'On demand, whenever it hits' },
    ],
  },
  {
    key: 'sound',
    title: 'What sound do you sink into?',
    hint: 'This becomes your default environment.',
    options: [
      { value: 'rain', label: 'Rain', sub: 'Steady on the roof' },
      { value: 'storm', label: 'Thunderstorm', sub: 'Distant thunder, heavy rain' },
      { value: 'ocean', label: 'Ocean', sub: 'Long tidal breathing' },
      { value: 'forest', label: 'Forest', sub: 'Birdsong and open air' },
      { value: 'fire', label: 'Fireplace', sub: 'Crackle and warmth' },
      { value: 'piano', label: 'Soft piano', sub: 'Slow, spacious keys' },
      { value: 'bowls', label: 'Singing bowls', sub: 'Resonant metal' },
      { value: 'silence', label: 'Pure tone alone', sub: 'Nothing else in the room' },
    ],
  },
  {
    key: 'experience',
    title: 'How much frequency work have you done?',
    options: [
      { value: 'new', label: 'This is new to me', sub: 'Start me gently' },
      { value: 'some', label: 'A little', sub: 'I have listened before' },
      { value: 'deep', label: 'I practice regularly', sub: 'Go straight to the work' },
    ],
  },
]

const SOUND_MAP = {
  rain: { ambience: 'rain-roof', music: 'ambient-pad' },
  storm: { ambience: 'storm', music: 'drone-warm' },
  ocean: { ambience: 'ocean-waves', music: 'piano-calm' },
  forest: { ambience: 'forest-birds', music: 'ambient-pad' },
  fire: { ambience: 'fireplace', music: 'piano-nocturne' },
  piano: { ambience: 'none', music: 'piano-calm' },
  bowls: { ambience: 'none', music: 'singing-bowl' },
  silence: { ambience: 'none', music: 'none' },
}

function scoreProfile(answers) {
  const w = {}
  const add = (k, n) => { w[k] = (w[k] || 0) + n }

  for (const k of answers.focus || []) add(k, 4)

  const seat = {
    body: [['healing', 3], ['strength', 1]],
    mind: [['clarity', 3], ['guidance', 1]],
    heart: [['love', 3], ['release', 1]],
    spirit: [['divine', 3], ['guidance', 2]],
    drained: [['sleep', 3], ['healing', 1]],
  }[answers.seat] || []
  for (const [k, n] of seat) add(k, n)

  if (answers.sleep === 'poor') add('sleep', 3)
  if (answers.sleep === 'broken') add('sleep', 2)

  const stress = parseInt(answers.stress || '1', 10)
  add('release', (stress - 1) * 0.9)
  add('healing', (stress - 1) * 0.4)

  const faith = {
    daily: [['divine', 3], ['guidance', 1]],
    sometimes: [['divine', 2]],
    searching: [['divine', 2], ['guidance', 2]],
    secular: [['clarity', 1], ['healing', 1]],
  }[answers.faith] || []
  for (const [k, n] of faith) add(k, n)

  let hours = 4
  const when = {
    sleep: [['sleep', 3]],
    allnight: [['sleep', 2]],
    work: [['clarity', 2]],
    meditate: [['divine', 1], ['guidance', 1]],
    pain: [['healing', 3]],
  }[answers.when] || []
  for (const [k, n] of when) add(k, n)
  if (answers.when === 'sleep') hours = 8
  if (answers.when === 'allnight') hours = 12

  const blend = SOUND_MAP[answers.sound] || SOUND_MAP.rain
  const ranked = Object.entries(w).sort((a, b) => b[1] - a[1]).map(([k]) => k)

  return { weights: w, intents: ranked.slice(0, 4), hours, ...blend }
}

function rankFrequencies(frequencies, weights) {
  return (frequencies || [])
    .map((f) => {
      const s = (f.intents || []).reduce((acc, k) => acc + (weights[k] || 0), 0)
      return { f, s }
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.f.hz - b.f.hz)
    .map((x) => x.f)
}

function buildPlan(primaryName, hours, ambienceLabel, experience) {
  const gentle = experience === 'new'
  return [
    `Day 1 — Meet ${primaryName}. One full ${hours}-hour block${gentle ? ' at a volume you can barely notice' : ''}. Ask nothing of it. Just let the room change.`,
    `Day 2 — Same tone, same hour of the day. Repetition is what makes this work; novelty is what breaks it.`,
    `Day 3 — Add ${ambienceLabel === 'Silence' ? 'nothing — keep it bare' : ambienceLabel.toLowerCase()} underneath and notice whether your body settles faster than it did on day one.`,
    `Day 4 — Write one line before you begin: what you are asking for. Read it again when the session ends.`,
    `Day 5 — Take a supporting frequency instead of the primary today. Contrast teaches you what the primary is actually doing.`,
    `Day 6 — Return to ${primaryName} for a full block, and this time stay awake for the first twenty minutes with your eyes closed.`,
    `Day 7 — Rest, or run the block overnight without listening for anything. Then look back at the week and name one thing that moved.`,
  ]
}

export default function Attune() {
  const navigate = useNavigate()
  const { data: frequencies } = useLiveShared('frequencies', { limit: 100 })
  const { data: profiles } = useLive('auraProfile')
  const [localProfile, setLocalProfile] = useState(null)
  const saved = (profiles || [])[0] || localProfile
  const { start } = usePlayer()

  const [taking, setTaking] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)

  const q = QUESTIONS[step]

  const toggle = (value) => {
    setAnswers((prev) => {
      if (!q.multi) return { ...prev, [q.key]: value }
      const cur = prev[q.key] || []
      if (cur.includes(value)) return { ...prev, [q.key]: cur.filter((v) => v !== value) }
      if (cur.length >= q.max) return prev
      return { ...prev, [q.key]: [...cur, value] }
    })
  }

  const answered = q ? (q.multi ? (answers[q.key] || []).length > 0 : !!answers[q.key]) : false

  const finish = async () => {
    setSaving(true)
    try {
      const result = scoreProfile(answers)
      const ranked = rankFrequencies(frequencies, result.weights)
      const profile = {
        answers,
        intents: result.intents,
        hours: result.hours,
        ambience: result.ambience,
        music: result.music,
        experience: answers.experience || 'some',
        primary: ranked[0]?.slug || null,
        supporting: ranked.slice(1, 4).map((f) => f.slug),
        createdAt: new Date().toISOString(),
      }
      setLocalProfile(profile)
      await db.upsert('auraProfile', profile, PROFILE_ID)
      setTaking(false)
      setStep(0)
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    if (step < QUESTIONS.length - 1) setStep((s) => s + 1)
    else finish()
  }

  // ─── results ────────────────────────────────────────────────────
  const primaryFreq = useMemo(
    () => (frequencies || []).find((f) => f.slug === saved?.primary),
    [frequencies, saved]
  )
  const supportFreqs = useMemo(
    () => (saved?.supporting || []).map((s) => (frequencies || []).find((f) => f.slug === s)).filter(Boolean),
    [frequencies, saved]
  )

  if (!taking && saved && primaryFreq) {
    const amb = AMBIENCE_MAP[saved.ambience] || AMBIENCE_MAP.none
    const mus = MUSIC_MAP[saved.music] || MUSIC_MAP.none
    const plan = buildPlan(primaryFreq.name, saved.hours, amb.label, saved.experience)

    const begin = () => {
      start(
        { id: primaryFreq.slug, title: `${primaryFreq.hz}Hz — ${primaryFreq.name}`, hz: primaryFreq.hz },
        saved.hours,
        { ambience: saved.ambience, music: saved.music }
      )
      navigate('/session')
    }

    return (
      <div className="pt-[env(safe-area-inset-top,0px)] max-w-2xl mx-auto w-full px-4 md:px-8 pb-12">
        <div className="pt-8 text-center animate-fade-up">
          <Compass size={22} className="text-[rgb(212,175,120)] mx-auto" />
          <h1 className="font-display text-5xl text-white mt-2">Your Attunement</h1>
          <p className="text-white/40 text-xs font-serif-elegant italic mt-1">
            Built from your answers · retake it whenever the season changes
          </p>
        </div>

        {/* Primary */}
        <div className="glass-card rounded-3xl p-6 mt-7 text-center animate-fade-up" style={{ animationDelay: '0.08s' }}>
          <p className="text-white/40 text-[10px] uppercase tracking-[0.2em]">Your primary frequency</p>
          <p className="font-display text-7xl text-[rgb(212,175,120)] leading-none mt-2">{primaryFreq.hz}</p>
          <p className="text-white text-lg mt-1">{primaryFreq.name}</p>
          <p className="text-[rgb(90,200,190)] text-sm font-serif-elegant italic">{primaryFreq.tagline}</p>
          <p className="text-white/55 text-[13px] leading-relaxed mt-4">{primaryFreq.benefits}</p>

          <button
            onClick={begin}
            className="w-full mt-5 rounded-2xl bg-[rgb(90,200,190)]/15 border border-[rgb(90,200,190)]/50 text-[rgb(90,200,190)] py-3.5 flex items-center justify-center gap-2 font-medium"
          >
            <Play size={17} /> Begin your {saved.hours}-hour session
          </button>
          <button
            onClick={() => navigate(`/track/${primaryFreq.slug}`)}
            className="text-white/40 text-[11px] mt-3"
          >
            Read the full picture
          </button>
        </div>

        {/* Blend */}
        <div className="glass-card rounded-2xl p-5 mt-4 animate-fade-up" style={{ animationDelay: '0.12s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} className="text-[rgb(212,175,120)]" />
            <p className="text-white/55 text-[10px] uppercase tracking-[0.2em]">Your blend</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { k: 'Tone', v: `${primaryFreq.hz}Hz` },
              { k: 'Environment', v: amb.label },
              { k: 'Music', v: mus.label },
            ].map((x) => (
              <div key={x.k} className="rounded-xl bg-white/5 border border-white/10 py-3 px-2">
                <p className="text-white/35 text-[9px] uppercase tracking-wider">{x.k}</p>
                <p className="text-white text-[12px] mt-1 leading-tight">{x.v}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {(saved.intents || []).map((k) => {
              const it = INTENT_MAP[k]
              if (!it) return null
              const Icon = it.icon
              return (
                <span key={k} className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-white/60 text-[11px]">
                  <Icon size={12} /> {it.label}
                </span>
              )
            })}
          </div>
        </div>

        {/* Supporting */}
        {supportFreqs.length > 0 && (
          <div className="mt-6 animate-fade-up" style={{ animationDelay: '0.16s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[rgb(212,175,120)]" />
              <p className="text-white/55 text-[10px] uppercase tracking-[0.2em]">Also for you</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {supportFreqs.map((f) => (
                <button
                  key={f.slug}
                  onClick={() => navigate(`/track/${f.slug}`)}
                  className="glass-card rounded-2xl p-4 text-left"
                >
                  <p className="font-display text-4xl text-[rgb(90,200,190)] leading-none">{f.hz}</p>
                  <p className="text-white text-[13px] mt-1">{f.name}</p>
                  <p className="text-white/35 text-[11px] font-serif-elegant italic">{f.tagline}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan */}
        <div className="mt-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={14} className="text-[rgb(212,175,120)]" />
            <p className="text-white/55 text-[10px] uppercase tracking-[0.2em]">Your first seven days</p>
          </div>
          <div className="space-y-2.5">
            {plan.map((line, i) => (
              <div key={i} className="glass-card rounded-2xl px-4 py-3.5 flex gap-3">
                <span className="w-6 h-6 rounded-full bg-[rgb(212,175,120)]/15 border border-[rgb(212,175,120)]/40 text-[rgb(212,175,120)] text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-white/60 text-[13px] leading-[1.7]">{line}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setAnswers(saved.answers || {}); setStep(0); setTaking(true) }}
          className="w-full mt-7 rounded-2xl border border-white/12 text-white/60 py-3.5 flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCw size={15} /> Retake the attunement
        </button>

        {!auth.isAuthenticated() && (
          <p className="text-white/25 text-[11px] text-center mt-4 leading-relaxed">
            Your attunement is stored on this device. Sign in from the Account tab to carry it to every device.
          </p>
        )}
      </div>
    )
  }

  // ─── intro ──────────────────────────────────────────────────────
  if (!taking) {
    return (
      <div className="pt-[env(safe-area-inset-top,0px)] max-w-lg mx-auto w-full px-6 pb-12 flex flex-col items-center text-center min-h-full justify-center">
        <div className="pt-16 animate-fade-up">
          <Compass size={26} className="text-[rgb(212,175,120)] mx-auto" />
          <h1 className="font-display text-6xl text-white mt-3 leading-none">Attunement</h1>
          <p className="text-white/50 text-sm mt-4 leading-relaxed font-serif-elegant italic">
            Eight questions about your body, your mind and what you are carrying. From your answers
            SonicAurora chooses your primary frequency, the environment you will sink into, the
            length of your sessions, and a seven-day path to follow.
          </p>
          <p className="text-white/30 text-xs mt-4">Two minutes. No wrong answers.</p>
          <button
            onClick={() => { setStep(0); setTaking(true) }}
            className="w-full mt-8 rounded-2xl bg-[rgb(90,200,190)]/15 border border-[rgb(90,200,190)]/50 text-[rgb(90,200,190)] py-4 flex items-center justify-center gap-2 font-medium"
          >
            Begin the attunement <ArrowRight size={17} />
          </button>
        </div>
      </div>
    )
  }

  // ─── questionnaire ──────────────────────────────────────────────
  const selected = q.multi ? (answers[q.key] || []) : answers[q.key]

  return (
    <div className="pt-[env(safe-area-inset-top,0px)] max-w-lg mx-auto w-full px-5 pb-12">
      <div className="pt-5 flex items-center gap-3">
        <button
          onClick={() => (step === 0 ? setTaking(false) : setStep((s) => s - 1))}
          className="text-white/50"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="flex-1 flex gap-1">
          {QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-[rgb(212,175,120)]' : 'bg-white/12'
              }`}
            />
          ))}
        </div>
        <span className="text-white/35 text-[11px] font-mono shrink-0">
          {step + 1}/{QUESTIONS.length}
        </span>
      </div>

      <div key={q.key} className="animate-fade-up">
        <h2 className="text-white text-xl font-medium mt-8 leading-snug">{q.title}</h2>
        {q.hint && <p className="text-white/35 text-xs font-serif-elegant italic mt-1.5">{q.hint}</p>}

        <div className="mt-6 space-y-2.5">
          {q.options.map((opt) => {
            const on = q.multi ? selected.includes(opt.value) : selected === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`w-full rounded-2xl px-4 py-3.5 border text-left flex items-center gap-3 transition-colors ${
                  on
                    ? 'bg-[rgb(90,200,190)]/12 border-[rgb(90,200,190)]/55'
                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className={`block text-[14px] ${on ? 'text-white' : 'text-white/80'}`}>{opt.label}</span>
                  {opt.sub && <span className="block text-white/35 text-[11px] mt-0.5 leading-snug">{opt.sub}</span>}
                </span>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    on ? 'bg-[rgb(90,200,190)] border-[rgb(90,200,190)]' : 'border-white/25'
                  }`}
                >
                  {on && <Check size={12} className="text-[#07131a]" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={next}
        disabled={!answered || saving}
        className={`w-full mt-7 rounded-2xl py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
          answered && !saving
            ? 'bg-[rgb(212,175,120)]/18 border border-[rgb(212,175,120)]/55 text-[rgb(212,175,120)]'
            : 'bg-white/5 border border-white/10 text-white/25'
        }`}
      >
        {saving
          ? 'Reading your answers…'
          : step === QUESTIONS.length - 1
            ? 'Reveal my attunement'
            : 'Continue'}
        {!saving && <ArrowRight size={17} />}
      </button>
    </div>
  )
}
