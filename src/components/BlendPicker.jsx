import { Layers, SlidersHorizontal, Radio, CloudRain, RotateCcw } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'
import { useMembership } from '../hooks/useMembership'
import MemberLock from './MemberLock'
import { AMBIENCES, MUSIC_BEDS } from '../soundscapes'

function Row({ items, activeId, onPick }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1">
      {items.map(({ id, label, desc, icon: Icon }) => {
        const on = activeId === id
        return (
          <button
            key={id}
            onClick={() => onPick(id)}
            className={`shrink-0 w-[132px] rounded-2xl border px-3 py-2.5 text-left transition-colors ${
              on
                ? 'bg-[rgb(90,200,190)]/14 border-[rgb(90,200,190)]/55'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <Icon size={15} className={on ? 'text-[rgb(90,200,190)]' : 'text-white/45'} />
            <span className={`block text-[12px] mt-1.5 leading-tight ${on ? 'text-white' : 'text-white/70'}`}>
              {label}
            </span>
            <span className="block text-white/30 text-[10px] leading-snug mt-0.5">{desc}</span>
          </button>
        )
      })}
    </div>
  )
}

function Slider({ label, value, onChange, tint, out }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/45 text-[11px] w-16 shrink-0">{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 appearance-none rounded-full bg-white/10 outline-none"
        style={{ accentColor: tint }}
      />
      <span className="text-white/30 text-[10px] w-8 text-right font-mono shrink-0">
        {Math.round((out !== undefined ? out : value) * 100)}
      </span>
    </div>
  )
}

/** One labelled mixer channel with its own level(s). */
function Channel({ icon: Icon, name, note, tint, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
          style={{ color: tint, borderColor: `${tint.replace('rgb', 'rgba').replace(')', ',0.5)')}`, background: `${tint.replace('rgb', 'rgba').replace(')', ',0.12)')}` }}
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <p className="text-white text-[12.5px] font-medium leading-tight">{name}</p>
          <p className="text-white/30 text-[10px] leading-tight">{note}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/**
 * The layer desk: an environment, an instrumental bed, and a proper two-channel
 * mixer — frequency signal vs ambient bed, a crossfader between them, and a
 * master level. Choices apply live and carry into the next session.
 */
export default function BlendPicker({ toneLabel = 'Frequency' }) {
  const {
    ambienceId, musicId, volumes, setLayer, setVolume,
    master, setMaster, balance, setBalance, resetMix, mixLevel,
  } = usePlayer()
  const { hasAccess } = useMembership()

  return (
    <div className={`space-y-5 relative ${hasAccess ? '' : 'min-h-[340px]'}`}>
      {!hasAccess && (
        <MemberLock
          variant="overlay"
          label="Your free listening is complete"
          line="Members keep the Layer Desk — storms, ocean, forest and instrumental beds layered under the tone."
        />
      )}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers size={13} className="text-[rgb(212,175,120)]" />
          <p className="text-white/50 text-[10px] uppercase tracking-[0.18em]">Environment</p>
        </div>
        <Row items={AMBIENCES} activeId={ambienceId} onPick={(id) => setLayer('ambience', id)} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers size={13} className="text-[rgb(212,175,120)]" />
          <p className="text-white/50 text-[10px] uppercase tracking-[0.18em]">Instrumental Bed</p>
        </div>
        <Row items={MUSIC_BEDS} activeId={musicId} onPick={(id) => setLayer('music', id)} />
        <p className="text-white/25 text-[10px] leading-relaxed mt-2">
          The exact tone is generated live and layered over the music, so any bed becomes a
          frequency-embedded track.
        </p>
      </div>

      {/* Two-channel mixer */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={13} className="text-[rgb(212,175,120)]" />
            <p className="text-white/50 text-[10px] uppercase tracking-[0.18em]">Mixer</p>
          </div>
          <button
            onClick={resetMix}
            className="flex items-center gap-1 text-white/35 text-[10px] hover:text-white/60 transition-colors"
          >
            <RotateCcw size={10} /> Gentle default
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Channel
            icon={Radio}
            name="Frequency signal"
            note="The healing tone itself"
            tint="rgb(212,175,120)"
          >
            <Slider
              label={toneLabel}
              value={volumes.tone}
              out={mixLevel('tone')}
              onChange={(v) => setVolume('tone', v)}
              tint="rgb(212,175,120)"
            />
          </Channel>

          <Channel
            icon={CloudRain}
            name="Ambient sound"
            note="Nature and music together"
            tint="rgb(90,200,190)"
          >
            <Slider
              label="Nature"
              value={volumes.ambience}
              out={mixLevel('ambience')}
              onChange={(v) => setVolume('ambience', v)}
              tint="rgb(90,200,190)"
            />
            <Slider
              label="Music"
              value={volumes.music}
              out={mixLevel('music')}
              onChange={(v) => setVolume('music', v)}
              tint="rgb(150,160,235)"
            />
          </Channel>
        </div>

        {/* Crossfader */}
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] mb-2">
            <span className="text-[rgb(212,175,120)]/80">Frequency</span>
            <span className="text-white/30">Balance</span>
            <span className="text-[rgb(90,200,190)]/80">Ambient</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(parseFloat(e.target.value))}
            className="w-full h-1.5 appearance-none rounded-full outline-none"
            style={{
              accentColor: 'rgb(255,255,255)',
              background: 'linear-gradient(90deg, rgba(212,175,120,0.5), rgba(255,255,255,0.12), rgba(90,200,190,0.5))',
            }}
          />
          <p className="text-white/25 text-[10px] leading-relaxed mt-2">
            Slide toward whichever should lead. The signal is set to sit gently under the
            soundscape by default so the tone never overpowers it.
          </p>

          <div className="mt-3 pt-3 border-t border-white/10">
            <Slider label="Master" value={master} onChange={setMaster} tint="rgb(255,255,255)" />
          </div>
        </div>
      </div>
    </div>
  )
}
