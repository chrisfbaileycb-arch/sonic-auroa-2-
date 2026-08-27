import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { db } from '../lib/db'
import { audio } from '../lib/audio'
import { useMembership } from './useMembership'
import { AMBIENCE_MAP, MUSIC_MAP, visualFor } from '../soundscapes'

const PlayerContext = createContext(null)

const STATE_COLL = 'playbackState'
const STATE_ID = 'current'

/**
 * Two channels: the FREQUENCY signal (the tone, or a linked/uploaded track) and
 * the AMBIENT bed (nature + instrumental). The signal starts dampened roughly
 * 6dB under the bed so a generated tone never overpowers a peaceful soundscape.
 */
export const DEFAULT_VOLUMES = { tone: 0.32, ambience: 0.65, music: 0.5 }
export const DEFAULT_MASTER = 0.85
/** 0 = frequency only · 0.5 = even · 1 = ambient only */
export const DEFAULT_BALANCE = 0.5

/** Max oscillator gain, so the tone never overpowers the beds. */
const toneGain = (v) => 0.34 * Math.max(0, Math.min(1, v))

async function resolveLayerUrl(kind, id) {
  if (!id || id === 'none') return null
  const item = (kind === 'ambience' ? AMBIENCE_MAP : MUSIC_MAP)[id]
  if (!item) return null
  if (item.url) return item.url
  try {
    return await audio.ambient.get(item.id)
  } catch (e) {
    return null
  }
}

export function PlayerProvider({ children }) {
  const { isMember, hasAccess, addPlayback, openUnlock } = useMembership()
  const memberRef = useRef(isMember)
  const accessRef = useRef(hasAccess)
  const pauseRef = useRef(null)
  useEffect(() => { memberRef.current = isMember }, [isMember])
  useEffect(() => { accessRef.current = hasAccess }, [hasAccess])

  const ctxRef = useRef(null)
  const oscRef = useRef(null)
  const osc2Ref = useRef(null)
  const gainRef = useRef(null)
  const audioElRef = useRef(null)
  const ambRef = useRef(null)
  const musRef = useRef(null)
  const intervalRef = useRef(null)
  const saveTimerRef = useRef(null)
  const endAtRef = useRef(null)
  const snapshotRef = useRef(null)
  const playingRef = useRef(false)
  const volumesRef = useRef(DEFAULT_VOLUMES)
  const masterRef = useRef(DEFAULT_MASTER)
  const balanceRef = useRef(DEFAULT_BALANCE)

  const [track, setTrack] = useState(null) // { id, title, hz, audioUrl }
  const [isPlaying, setIsPlaying] = useState(false)
  const [durationHours, setDurationHours] = useState(4)
  const [remainingSec, setRemainingSec] = useState(0)
  const [totalSec, setTotalSec] = useState(0)

  // Layered mix
  const [ambienceId, setAmbienceId] = useState('none')
  const [musicId, setMusicId] = useState('none')
  const [volumes, setVolumesState] = useState(DEFAULT_VOLUMES)
  const [master, setMasterState] = useState(DEFAULT_MASTER)
  const [balance, setBalanceState] = useState(DEFAULT_BALANCE)

  // "Pick up where you left off"
  const [lastSession, setLastSession] = useState(null)

  useEffect(() => { volumesRef.current = volumes }, [volumes])
  useEffect(() => { playingRef.current = isPlaying }, [isPlaying])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // ─── persistence ────────────────────────────────────────────────
  const persist = useCallback(async (partial) => {
    try {
      await db.upsert(STATE_COLL, { ...partial, savedAt: Date.now() }, STATE_ID)
    } catch (e) {
      /* offline / not critical */
    }
  }, [])

  const saveSnapshot = useCallback(() => {
    const snap = snapshotRef.current
    if (!snap) return
    const remain = endAtRef.current
      ? Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      : snap.remainingSec
    if (remain <= 30) return
    persist({
      ...snap,
      remainingSec: remain,
      ambienceId,
      musicId,
      volumes: volumesRef.current,
      master: masterRef.current,
      balance: balanceRef.current,
    })
  }, [persist, ambienceId, musicId])

  const clearSaved = useCallback(() => {
    snapshotRef.current = null
    setLastSession(null)
    persist({ trackId: null, title: null, hz: null, audioUrl: null, remainingSec: 0, hours: null })
  }, [persist])

  // load on first mount
  useEffect(() => {
    let alive = true
    db.get(STATE_COLL, STATE_ID)
      .then((row) => {
        if (!alive || !row || !row.trackId) return
        if (!row.remainingSec || row.remainingSec < 60) return
        setLastSession(row)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // ─── audio primitives ───────────────────────────────────────────
  const stopTone = useCallback(() => {
    const ctx = ctxRef.current
    if (gainRef.current && ctx) {
      const now = ctx.currentTime
      try {
        gainRef.current.gain.cancelScheduledValues(now)
        gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, now)
        gainRef.current.gain.linearRampToValueAtTime(0, now + 1.2)
      } catch (e) {}
    }
    const osc = oscRef.current
    const osc2 = osc2Ref.current
    setTimeout(() => {
      try { osc && osc.stop() } catch (e) {}
      try { osc2 && osc2.stop() } catch (e) {}
    }, 1300)
    oscRef.current = null
    osc2Ref.current = null
    gainRef.current = null
  }, [])

  const stopAudioEl = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.src = ''
      audioElRef.current = null
    }
  }, [])

  const stopLayers = useCallback(() => {
    for (const ref of [ambRef, musRef]) {
      if (ref.current) {
        try { ref.current.pause() } catch (e) {}
        ref.current.src = ''
        ref.current = null
      }
    }
  }, [])

  // ─── two-channel mixing ─────────────────────────────────────────
  /** Final level for one layer: its own slider × master × crossfader side. */
  const mixLevel = useCallback((kind) => {
    const b = balanceRef.current
    const side = kind === 'tone' ? Math.min(1, 2 * (1 - b)) : Math.min(1, 2 * b)
    return Math.max(0, Math.min(1, volumesRef.current[kind] * masterRef.current * side))
  }, [])

  const applyLevels = useCallback(() => {
    const toneV = mixLevel('tone')
    // a linked/uploaded track IS the frequency channel
    if (audioElRef.current) audioElRef.current.volume = Math.min(1, toneV * 1.6)
    if (gainRef.current && ctxRef.current) {
      const now = ctxRef.current.currentTime
      try {
        gainRef.current.gain.cancelScheduledValues(now)
        gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, now)
        gainRef.current.gain.linearRampToValueAtTime(playingRef.current ? toneGain(toneV) : 0, now + 0.25)
      } catch (e) {}
    }
    if (ambRef.current) ambRef.current.volume = mixLevel('ambience')
    if (musRef.current) musRef.current.volume = mixLevel('music')
  }, [mixLevel])

  const playTone = useCallback((hz) => {
    stopTone()
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!ctxRef.current) ctxRef.current = new AudioCtx()
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = hz
    osc.connect(gain)
    osc.start()

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = hz * 2
    const gain2 = ctx.createGain()
    gain2.gain.value = 0.12
    osc2.connect(gain2)
    gain2.connect(gain)
    osc2.start()

    const now = ctx.currentTime
    gain.gain.linearRampToValueAtTime(toneGain(mixLevel('tone')), now + 2)

    oscRef.current = osc
    osc2Ref.current = osc2
    gainRef.current = gain
  }, [stopTone, mixLevel])

  const playAudioUrl = useCallback((url) => {
    stopAudioEl()
    const el = new Audio(url)
    el.loop = true
    el.volume = Math.min(1, mixLevel('tone') * 1.6)
    el.play().catch(() => {})
    audioElRef.current = el
  }, [stopAudioEl, mixLevel])

  /**
   * Swap one of the two bed layers. Works whether or not a session is running —
   * a layer chosen before playback simply starts with the session.
   */
  const setLayer = useCallback(async (kind, id) => {
    // Everything is open during the trial; once it is spent, the desk locks.
    if (!accessRef.current && id && id !== 'none') { openUnlock('locked'); return }
    const ref = kind === 'ambience' ? ambRef : musRef
    if (kind === 'ambience') setAmbienceId(id)
    else setMusicId(id)

    if (ref.current) {
      try { ref.current.pause() } catch (e) {}
      ref.current.src = ''
      ref.current = null
    }
    if (!id || id === 'none') return

    // create the element before awaiting so iOS keeps the gesture attached
    const el = new Audio()
    el.loop = true
    el.volume = mixLevel(kind)
    ref.current = el

    const url = await resolveLayerUrl(kind, id)
    if (ref.current !== el) return // superseded by a newer choice
    if (!url) { ref.current = null; return }
    el.src = url
    if (playingRef.current) el.play().catch(() => {})
  }, [mixLevel, openUnlock])

  const setVolume = useCallback((kind, v) => {
    const val = Math.max(0, Math.min(1, v))
    const next = { ...volumesRef.current, [kind]: val }
    volumesRef.current = next
    setVolumesState(next)
    applyLevels()
  }, [applyLevels])

  /** Overall loudness of the whole mix. */
  const setMaster = useCallback((v) => {
    const val = Math.max(0, Math.min(1, v))
    masterRef.current = val
    setMasterState(val)
    applyLevels()
  }, [applyLevels])

  /** Crossfader between the frequency signal and the ambient bed. */
  const setBalance = useCallback((v) => {
    const val = Math.max(0, Math.min(1, v))
    balanceRef.current = val
    setBalanceState(val)
    applyLevels()
  }, [applyLevels])

  /** Back to the gentle factory mix (signal sitting under the bed). */
  const resetMix = useCallback(() => {
    volumesRef.current = DEFAULT_VOLUMES
    masterRef.current = DEFAULT_MASTER
    balanceRef.current = DEFAULT_BALANCE
    setVolumesState(DEFAULT_VOLUMES)
    setMasterState(DEFAULT_MASTER)
    setBalanceState(DEFAULT_BALANCE)
    applyLevels()
  }, [applyLevels])

  // ─── transport ──────────────────────────────────────────────────
  const finish = useCallback((clearMemory) => {
    clearTimer()
    stopTone()
    stopAudioEl()
    stopLayers()
    setIsPlaying(false)
    playingRef.current = false
    setTrack(null)
    setRemainingSec(0)
    setTotalSec(0)
    endAtRef.current = null
    if (clearMemory) clearSaved()
  }, [clearTimer, stopTone, stopAudioEl, stopLayers, clearSaved])

  const stop = useCallback(() => {
    finish(true)
  }, [finish])

  const tick = useCallback(() => {
    if (!endAtRef.current) return
    const remain = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
    setRemainingSec(remain)
    if (remain <= 0) { finish(true); return }
    // meter the free trial — 30 minutes of cumulative listening, then the gate
    if (!memberRef.current) {
      const left = addPlayback(1)
      if (left <= 0) {
        accessRef.current = false
        if (pauseRef.current) pauseRef.current()
        openUnlock('expired')
      }
    }
  }, [finish, addPlayback, openUnlock])

  const startTimer = useCallback((hours) => {
    clearTimer()
    const total = Math.round(hours * 3600)
    endAtRef.current = Date.now() + total * 1000
    setTotalSec(total)
    setRemainingSec(total)
    intervalRef.current = setInterval(tick, 1000)
  }, [clearTimer, tick])

  /**
   * start(track, hours, opts)
   *   opts.ambience / opts.music — optionally switch the beds as the session begins.
   */
  const start = useCallback(async (newTrack, hours, opts = {}) => {
    if (!accessRef.current) { openUnlock('expired'); return }
    const runHours = hours
    stopTone()
    stopAudioEl()
    setTrack(newTrack)
    setDurationHours(runHours)
    setIsPlaying(true)
    playingRef.current = true
    startTimer(runHours)

    if (newTrack.audioUrl) {
      playAudioUrl(newTrack.audioUrl)
    } else if (newTrack.hz) {
      playTone(newTrack.hz)
    }

    const nextAmb = opts.ambience !== undefined ? opts.ambience : ambienceId
    const nextMus = opts.music !== undefined ? opts.music : musicId

    const ensure = (kind, desiredId, currentId, ref) => {
      if (desiredId !== currentId || !ref.current) {
        if (desiredId && desiredId !== 'none') setLayer(kind, desiredId)
        else if (desiredId !== currentId) setLayer(kind, 'none')
      } else {
        ref.current.play().catch(() => {})
      }
    }
    ensure('ambience', nextAmb, ambienceId, ambRef)
    ensure('music', nextMus, musicId, musRef)

    const snap = {
      trackId: newTrack.id,
      title: newTrack.title,
      hz: newTrack.hz || null,
      audioUrl: newTrack.audioUrl || null,
      hours: runHours,
      remainingSec: Math.round(runHours * 3600),
      ambienceId: nextAmb,
      musicId: nextMus,
      volumes: volumesRef.current,
      master: masterRef.current,
      balance: balanceRef.current,
    }
    snapshotRef.current = snap
    setLastSession(snap)
    persist(snap)
  }, [stopTone, stopAudioEl, startTimer, playAudioUrl, playTone, persist, setLayer, ambienceId, musicId, openUnlock])

  const pause = useCallback(() => {
    if (audioElRef.current) audioElRef.current.pause()
    if (ambRef.current) ambRef.current.pause()
    if (musRef.current) musRef.current.pause()
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setValueAtTime(gainRef.current.gain.value, ctxRef.current.currentTime)
      gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 0.4)
    }
    clearTimer()
    setIsPlaying(false)
    playingRef.current = false
    saveSnapshot()
  }, [clearTimer, saveSnapshot])

  const resume = useCallback(() => {
    if (!track) return
    if (!accessRef.current) { openUnlock('expired'); return }
    setIsPlaying(true)
    playingRef.current = true
    if (endAtRef.current) {
      const remain = Math.max(0, (endAtRef.current - Date.now()) / 1000)
      startTimer(remain / 3600)
    }
    if (track.audioUrl && audioElRef.current) {
      audioElRef.current.play().catch(() => {})
    } else if (track.hz) {
      playTone(track.hz)
    }
    if (ambRef.current) ambRef.current.play().catch(() => {})
    if (musRef.current) musRef.current.play().catch(() => {})
  }, [track, startTimer, playTone, openUnlock])

  // let the trial meter halt playback from inside the tick
  useEffect(() => { pauseRef.current = pause }, [pause])

  /** Restart the saved session from exactly where it was left. */
  const resumeLast = useCallback(() => {
    const s = lastSession
    if (!s || !s.trackId) return
    if (s.volumes) {
      volumesRef.current = { ...DEFAULT_VOLUMES, ...s.volumes }
      setVolumesState(volumesRef.current)
    }
    if (typeof s.master === 'number') { masterRef.current = s.master; setMasterState(s.master) }
    if (typeof s.balance === 'number') { balanceRef.current = s.balance; setBalanceState(s.balance) }
    const hours = Math.max(0.02, (s.remainingSec || 0) / 3600)
    start(
      { id: s.trackId, title: s.title, hz: s.hz || undefined, audioUrl: s.audioUrl || undefined },
      hours,
      { ambience: s.ambienceId || 'none', music: s.musicId || 'none' }
    )
  }, [lastSession, start])

  const forgetLast = useCallback(() => { clearSaved() }, [clearSaved])

  // periodic + background snapshot saving (never more than once a minute)
  useEffect(() => {
    if (!isPlaying) return
    saveTimerRef.current = setInterval(saveSnapshot, 90000)
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [isPlaying, saveSnapshot])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') saveSnapshot() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', saveSnapshot)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', saveSnapshot)
    }
  }, [saveSnapshot])

  useEffect(() => () => { clearTimer(); stopTone(); stopAudioEl(); stopLayers() }, [])

  const value = {
    track, isPlaying, durationHours, remainingSec, totalSec,
    start, stop, pause, resume,
    lastSession, resumeLast, forgetLast,
    ambienceId, musicId, setLayer,
    volumes, setVolume, master, setMaster, balance, setBalance, resetMix, mixLevel,
    visualMode: visualFor(ambienceId, musicId),
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
