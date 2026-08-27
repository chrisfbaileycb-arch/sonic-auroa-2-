import {
  Ban, CloudRain, CloudLightning, Droplets, Waves, Trees, Flame, Wind,
  Bell, Music2, AudioWaveform, Moon,
} from 'lucide-react'

/** Generated at build time — a continuous night-storm bed. */
export const STORM_URL =
  'https://api.whacka.app/storage/v1/object/public/app-audio/26968d4c-998e-421c-aca2-861653b930c9/7be5a9b6-9db7-465b-ad13-162cd1167ecf.mp3'

/**
 * Nature / environment layer. `visual` selects the moving screensaver artwork.
 * Items without a `url` are resolved from the built-in ambient library.
 */
export const AMBIENCES = [
  { id: 'none', label: 'Silence', desc: 'Frequency only', icon: Ban, visual: 'aurora' },
  { id: 'rain-roof', label: 'Rain on the Roof', desc: 'Steady, soft, enveloping', icon: CloudRain, visual: 'rain' },
  { id: 'storm', label: 'Thunderstorm', desc: 'Distant thunder over heavy rain', icon: CloudLightning, visual: 'storm', url: STORM_URL },
  { id: 'rain-window', label: 'Rain at the Window', desc: 'Closer, gentler, indoors', icon: Droplets, visual: 'rain' },
  { id: 'ocean-waves', label: 'Ocean Waves', desc: 'Long tidal breathing', icon: Waves, visual: 'waves' },
  { id: 'creek', label: 'Mountain Creek', desc: 'Bright running water', icon: Droplets, visual: 'waves' },
  { id: 'forest-birds', label: 'Forest at Dawn', desc: 'Birdsong and open air', icon: Trees, visual: 'forest' },
  { id: 'fireplace', label: 'Fireplace', desc: 'Slow crackle and warmth', icon: Flame, visual: 'embers' },
  { id: 'brown-noise', label: 'Deep Brown Noise', desc: 'Masks the whole room', icon: Wind, visual: 'stars' },
  { id: 'white-noise', label: 'White Noise', desc: 'Even, neutral hush', icon: Wind, visual: 'stars' },
]

/**
 * Instrumental layer. The pure frequency rides on top of it, so every piece
 * of music effectively becomes a frequency-embedded track.
 */
export const MUSIC_BEDS = [
  { id: 'none', label: 'No Music', desc: 'Tone and nature only', icon: Ban, visual: null },
  { id: 'piano-calm', label: 'Calm Piano', desc: 'Slow, spacious keys', icon: Music2, visual: 'aura' },
  { id: 'piano-nocturne', label: 'Piano Nocturne', desc: 'Night-time, melancholic', icon: Music2, visual: 'aura' },
  { id: 'ambient-pad', label: 'Ambient Pad', desc: 'Wide, weightless texture', icon: AudioWaveform, visual: 'aurora' },
  { id: 'drone-warm', label: 'Warm Drone', desc: 'Low continuous body', icon: AudioWaveform, visual: 'aura' },
  { id: 'singing-bowl', label: 'Singing Bowl', desc: 'Resonant metal overtones', icon: Bell, visual: 'aura' },
  { id: 'music-box', label: 'Music Box', desc: 'Small, innocent, distant', icon: Music2, visual: 'stars' },
  { id: 'lullaby', label: 'Lullaby', desc: 'For falling asleep', icon: Moon, visual: 'stars' },
]

const toMap = (arr) => arr.reduce((acc, x) => { acc[x.id] = x; return acc }, {})

export const AMBIENCE_MAP = toMap(AMBIENCES)
export const MUSIC_MAP = toMap(MUSIC_BEDS)

/**
 * The screensaver artwork follows the sound. A chosen environment always wins;
 * with no environment, a melodic bed brings its own visual (warm pulsing aura
 * for piano and bowls, a drifting star-field for music box and lullaby).
 */
export function visualFor(ambienceId, musicId) {
  const amb = AMBIENCE_MAP[ambienceId]
  if (amb && amb.id !== 'none' && amb.visual) return amb.visual
  const mus = MUSIC_MAP[musicId]
  if (mus && mus.visual) return mus.visual
  return amb?.visual || 'aurora'
}
