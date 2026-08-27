import { HeartPulse, Eye, Sparkles, Shield, Compass, Wind, Moon, Heart } from 'lucide-react'

/**
 * The intentions a listener can arrive with. Each frequency row carries an
 * `intents` array of these keys.
 */
export const INTENTS = [
  { key: 'healing', label: 'Healing', icon: HeartPulse, line: 'Settle the body and let repair happen.' },
  { key: 'clarity', label: 'Clarity', icon: Eye, line: 'Clear the fog and think in straight lines again.' },
  { key: 'divine', label: 'Connect with God', icon: Sparkles, line: 'Open the channel. Listen more than you ask.' },
  { key: 'strength', label: 'Strength', icon: Shield, line: 'Steady the ground you stand on.' },
  { key: 'guidance', label: 'Guidance', icon: Compass, line: 'Quiet the noise so direction can surface.' },
  { key: 'release', label: 'Release', icon: Wind, line: 'Set down what you have been carrying.' },
  { key: 'sleep', label: 'Deep Sleep', icon: Moon, line: 'Long, unbroken hours of rest.' },
  { key: 'love', label: 'Love', icon: Heart, line: 'Warmth toward others, and toward yourself.' },
]

export const INTENT_MAP = INTENTS.reduce((acc, i) => {
  acc[i.key] = i
  return acc
}, {})
