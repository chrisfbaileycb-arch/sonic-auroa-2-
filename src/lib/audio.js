/**
 * Audio asset resolution — Supabase Storage.
 *
 * Replaces the Whacka platform audio SDK. `usePlayer` calls
 * `audio.ambient.get(id)` for any ambience or instrumental bed that does not
 * carry an explicit `url` in `src/soundscapes.js`, and treats a thrown error or
 * a null as "this layer has no audio" — the session still runs, just without
 * that bed. So a missing file degrades quietly rather than breaking playback.
 *
 * Expected layout in the bucket (public):
 *   ambient/<id>.mp3     e.g. ambient/rain-roof.mp3
 */
import { supabase, isConfigured, AUDIO_BUCKET } from './supabase'

const AMBIENT_PREFIX = 'ambient'

/** Cache resolved URLs — these are stable public paths, no need to re-derive. */
const cache = new Map()

export const audio = {
  ambient: {
    /**
     * @param {string} id soundscape id, e.g. 'ocean-waves'
     * @returns {Promise<string|null>} a playable URL, or null when unavailable
     */
    async get(id) {
      if (!id || id === 'none') return null
      if (cache.has(id)) return cache.get(id)
      if (!isConfigured) return null

      const { data } = supabase
        .storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(`${AMBIENT_PREFIX}/${id}.mp3`)

      const url = data?.publicUrl || null
      cache.set(id, url)
      return url
    },
  },
}
