import { useEffect, useRef } from 'react'

const rnd = (a, b) => a + Math.random() * (b - a)

function init(mode, w, h, dense) {
  const s = { parts: [], t: 0, flash: 0, nextFlash: rnd(2500, 7000), shoot: null, nextShoot: rnd(4000, 12000) }
  const n = (base) => Math.round(base * (dense ? 1 : 0.4))

  if (mode === 'rain' || mode === 'storm') {
    const count = n(mode === 'storm' ? 220 : 150)
    for (let i = 0; i < count; i++) {
      s.parts.push({ x: rnd(-40, w + 40), y: rnd(-h, h), l: rnd(10, 26), v: rnd(0.55, 1.25), a: rnd(0.1, 0.4) })
    }
  } else if (mode === 'forest') {
    for (let i = 0; i < n(70); i++) {
      s.parts.push({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.7, 2.6), vx: rnd(-0.02, 0.03), vy: rnd(-0.035, -0.005), a: rnd(0.12, 0.5), p: rnd(0, 6.3) })
    }
  } else if (mode === 'embers') {
    for (let i = 0; i < n(80); i++) {
      s.parts.push({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.8, 2.4), vx: rnd(-0.02, 0.02), vy: rnd(-0.09, -0.03), a: rnd(0.2, 0.75), p: rnd(0, 6.3) })
    }
  } else if (mode === 'aura') {
    for (let i = 0; i < n(46); i++) {
      s.parts.push({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.5, 1.8), a: rnd(0.1, 0.4), p: rnd(0, 6.3), sp: rnd(0.0006, 0.002) })
    }
  } else if (mode === 'stars') {
    for (let i = 0; i < n(160); i++) {
      s.parts.push({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.5), a: rnd(0.15, 0.75), p: rnd(0, 6.3), sp: rnd(0.0006, 0.0025) })
    }
  }
  return s
}

function draw(ctx, mode, s, w, h, dt, dense) {
  ctx.clearRect(0, 0, w, h)
  if (!s) return
  s.t += dt

  if (mode === 'rain' || mode === 'storm') {
    const storm = mode === 'storm'
    const tilt = storm ? 0.28 : 0.14
    ctx.lineCap = 'round'
    for (const p of s.parts) {
      const sp = p.v * (storm ? 1.5 : 1) * dt * 0.09
      p.y += sp
      p.x += sp * tilt
      if (p.y > h + 30) { p.y = rnd(-120, -10); p.x = rnd(-40, w + 40) }
      ctx.strokeStyle = `rgba(174,220,235,${p.a})`
      ctx.lineWidth = p.r || 1
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.l * tilt, p.y - p.l)
      ctx.stroke()
    }
    if (storm) {
      s.nextFlash -= dt
      if (s.nextFlash <= 0) { s.flash = 1; s.nextFlash = rnd(4000, 12000) }
      if (s.flash > 0.001) {
        ctx.fillStyle = `rgba(190,222,255,${s.flash * (dense ? 0.3 : 0.16)})`
        ctx.fillRect(0, 0, w, h)
        s.flash *= Math.exp(-dt / 110)
      }
    }
    return
  }

  if (mode === 'waves') {
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const base = h * (0.52 + i * 0.1)
      const amp = 10 + i * 6
      const speed = 0.00035 + i * 0.00012
      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let x = 0; x <= w; x += 12) {
        const y = base + Math.sin(x * 0.006 + s.t * speed * 1000 + i) * amp
          + Math.sin(x * 0.0017 - s.t * speed * 620) * amp * 0.5
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h)
      ctx.closePath()
      const g = ctx.createLinearGradient(0, base - amp, 0, h)
      g.addColorStop(0, `rgba(90,200,190,${dense ? 0.09 : 0.05})`)
      g.addColorStop(1, 'rgba(20,60,90,0)')
      ctx.fillStyle = g
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    return
  }

  if (mode === 'forest' || mode === 'embers') {
    const ember = mode === 'embers'
    ctx.globalCompositeOperation = 'lighter'
    for (const p of s.parts) {
      p.x += p.vx * dt * 0.6
      p.y += p.vy * dt * 0.6
      p.p += dt * 0.002
      if (p.y < -20) { p.y = h + rnd(0, 40); p.x = rnd(0, w) }
      if (p.x < -20) p.x = w + 10
      if (p.x > w + 20) p.x = -10
      const a = p.a * (0.55 + 0.45 * Math.sin(p.p))
      const r = p.r * (ember ? 1 + 0.25 * Math.sin(p.p * 1.7) : 1)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5)
      if (ember) {
        g.addColorStop(0, `rgba(255,186,110,${a})`)
        g.addColorStop(1, 'rgba(255,120,40,0)')
      } else {
        g.addColorStop(0, `rgba(190,240,225,${a})`)
        g.addColorStop(1, 'rgba(90,200,190,0)')
      }
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * 5, 0, 6.3)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    return
  }

  if (mode === 'aura') {
    // slow warm waves breathing out of the centre — for melodic beds
    ctx.globalCompositeOperation = 'lighter'
    const cx = w / 2
    const cy = h * 0.48
    const reach = Math.max(w, h) * 0.62
    for (let i = 0; i < 4; i++) {
      const ph = ((s.t * 0.000055) + i * 0.25) % 1
      const r = (0.12 + ph * 0.88) * reach
      const a = (1 - ph) * (dense ? 0.13 : 0.06)
      const g = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r)
      g.addColorStop(0, 'rgba(255,205,150,0)')
      g.addColorStop(0.72, `rgba(248,196,132,${a})`)
      g.addColorStop(1, 'rgba(240,160,90,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, 6.3)
      ctx.fill()
    }
    const coreA = (dense ? 0.1 : 0.05) * (0.65 + 0.35 * Math.sin(s.t * 0.0006))
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * 0.34)
    core.addColorStop(0, `rgba(255,214,164,${coreA})`)
    core.addColorStop(1, 'rgba(255,180,110,0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(cx, cy, reach * 0.34, 0, 6.3)
    ctx.fill()
    for (const p of s.parts) {
      const a = p.a * (0.4 + 0.6 * Math.sin(p.p + s.t * p.sp))
      ctx.fillStyle = `rgba(255,226,190,${a})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, 6.3)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    return
  }

  if (mode === 'stars') {
    for (const p of s.parts) {
      const a = p.a * (0.45 + 0.55 * Math.sin(p.p + s.t * p.sp))
      ctx.fillStyle = `rgba(226,240,255,${a})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, 6.3)
      ctx.fill()
    }
    s.nextShoot -= dt
    if (s.nextShoot <= 0 && !s.shoot) {
      s.shoot = { x: rnd(w * 0.1, w * 0.9), y: rnd(0, h * 0.5), life: 1 }
      s.nextShoot = rnd(6000, 16000)
    }
    if (s.shoot) {
      const sh = s.shoot
      sh.x += dt * 0.35
      sh.y += dt * 0.13
      sh.life -= dt / 900
      if (sh.life <= 0) s.shoot = null
      else {
        ctx.strokeStyle = `rgba(255,255,255,${sh.life * 0.7})`
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(sh.x - 70, sh.y - 26)
        ctx.stroke()
      }
    }
    return
  }

  // aurora — soft vertical curtains
  ctx.globalCompositeOperation = 'lighter'
  const cols = ['90,200,190', '212,175,120', '120,140,235']
  for (let i = 0; i < 3; i++) {
    const phase = s.t * (0.00013 + i * 0.00006) + i * 2.1
    const cx = w * (0.25 + 0.25 * i) + Math.sin(phase) * w * 0.22
    const bw = w * (0.22 + 0.06 * i)
    ctx.beginPath()
    ctx.moveTo(cx - bw / 2, 0)
    for (let y = 0; y <= h; y += 18) {
      ctx.lineTo(cx - bw / 2 + Math.sin(y * 0.004 + phase * 3) * 26, y)
    }
    for (let y = h; y >= 0; y -= 18) {
      ctx.lineTo(cx + bw / 2 + Math.sin(y * 0.004 + phase * 3 + 0.7) * 26, y)
    }
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, `rgba(${cols[i]},0)`)
    g.addColorStop(0.45, `rgba(${cols[i]},${dense ? 0.1 : 0.05})`)
    g.addColorStop(1, `rgba(${cols[i]},0)`)
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * Moving artwork that matches the chosen environment — rain streaks, lightning,
 * tides, embers, drifting motes, stars. Used lightly behind the session screen
 * and full-strength in screensaver mode.
 */
export default function AmbientVisual({ mode = 'aurora', dense = false, active = true, lowPower = false, className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 1
    let h = 1
    let state = null
    let raf = 0
    let last = performance.now()

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      w = Math.max(1, Math.round(r.width))
      h = Math.max(1, Math.round(r.height))
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      state = init(mode, w, h, dense)
    }
    resize()
    window.addEventListener('resize', resize)

    // in nightlight mode the canvas repaints far less often to spare the battery
    const minFrame = lowPower ? 70 : 0
    let acc = 0
    const loop = (t) => {
      const dt = Math.min(48, t - last)
      last = t
      acc += dt
      if (acc >= minFrame) {
        draw(ctx, mode, state, w, h, active && !reduced ? acc : 0, dense)
        acc = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [mode, dense, active, lowPower])

  return <canvas ref={canvasRef} aria-hidden="true" className={`w-full h-full block ${className}`} />
}
