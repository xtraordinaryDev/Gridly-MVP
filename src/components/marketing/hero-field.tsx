"use client"

import { useEffect, useRef } from "react"

/**
 * Animated halftone "fuel grid" behind the hero: a lattice of dots whose size
 * and brightness ride slow waves, and swell toward the pointer. Pure canvas,
 * no library, ~1ms a frame on a laptop. Pauses when the tab is hidden and
 * renders a single still frame for people who prefer reduced motion.
 */
export function HeroField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const context = canvas.getContext("2d", { alpha: true })
    if (!context) return
    const ctx = context // narrowed copies: closures below keep the non-null type
    const cv = canvas

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const parent = cv.parentElement ?? canvas

    let width = 0
    let height = 0
    let dpr = 1
    let spacing = 22
    let cols = 0
    let rows = 0
    // Pointer in canvas pixels; target follows the mouse, current eases toward it.
    const target = { x: -9999, y: -9999 }
    const cur = { x: -9999, y: -9999 }
    // When no pointer is over the hero a virtual one wanders the field on a
    // slow Lissajous path, so the grid keeps flowing on its own.
    let hovering = false
    let settled = false
    let raf = 0
    let last = performance.now()
    let t = 0
    let running = true

    function resize() {
      const r = parent.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, Math.floor(r.width))
      height = Math.max(1, Math.floor(r.height))
      cv.width = Math.floor(width * dpr)
      cv.height = Math.floor(height * dpr)
      cv.style.width = `${width}px`
      cv.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      spacing = width < 640 ? 26 : 22
      cols = Math.ceil(width / spacing) + 1
      rows = Math.ceil(height / spacing) + 1
    }

    // Two drifting sine fields summed: cheap, smooth, and it reads as fuel
    // moving through a grid rather than random noise.
    function field(x: number, y: number, time: number) {
      const a = Math.sin(x * 0.012 + time * 0.9) * Math.cos(y * 0.011 - time * 0.7)
      const b = Math.sin((x + y) * 0.0075 - time * 0.55)
      const c = Math.cos((x - y * 0.6) * 0.009 + time * 0.4)
      // A travelling band that sweeps left to right, like a pulse through pipe.
      const d = Math.sin(x * 0.006 - time * 1.1 + Math.sin(y * 0.01 + time * 0.3) * 0.8)
      return (a + b * 0.8 + c * 0.6 + d * 0.9) / 3.3 // roughly -1..1
    }

    function wander(time: number) {
      return {
        x: width * (0.5 + 0.42 * Math.sin(time * 0.27) * Math.cos(time * 0.11)),
        y: height * (0.5 + 0.38 * Math.sin(time * 0.19 + 1.3)),
      }
    }

    function draw(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!reduced) t += dt

      if (!hovering) {
        const w = wander(t)
        target.x = w.x
        target.y = w.y
        if (!settled) {
          cur.x = w.x
          cur.y = w.y
          settled = true
        }
      }
      // Ease the pointer so the swell glides instead of snapping; the roaming
      // swell eases slower so it drifts rather than darts.
      const ease = hovering ? 0.12 : 0.04
      cur.x += (target.x - cur.x) * ease
      cur.y += (target.y - cur.y) * ease

      ctx.clearRect(0, 0, width, height)
      const radius = Math.min(width, height) * (hovering ? 0.26 : 0.34)
      const cx = width * 0.5
      const cy = height * 0.5
      const fade = Math.max(width, height) * 0.62 // dots fade toward the edges

      for (let j = 0; j < rows; j++) {
        const y = j * spacing
        for (let i = 0; i < cols; i++) {
          const x = i * spacing
          const f = field(x, y, t) // -1..1
          // Pointer influence: 1 at the pointer, 0 beyond radius.
          const dx = x - cur.x
          const dy = y - cur.y
          const d = Math.sqrt(dx * dx + dy * dy)
          const p = d < radius ? 1 - d / radius : 0
          const pe = p * p * (3 - 2 * p) * (hovering ? 1 : 0.7)
          // Edge fade keeps the center of the hero calm behind the text.
          const ex = x - cx
          const ey = y - cy
          const e = Math.min(1, Math.sqrt(ex * ex + ey * ey) / fade)
          const edge = 0.35 + 0.65 * e
          const base = 0.55 + 0.45 * f // 0.1..1
          const size = spacing * (0.06 + 0.17 * base + 0.28 * pe)
          const alpha = Math.min(1, (0.04 + 0.22 * base) * edge + 0.5 * pe)
          if (alpha < 0.03) continue
          // Brand blue, shifting toward emerald near the pointer.
          const g = Math.round(130 + 55 * pe)
          const b = Math.round(246 - 117 * pe)
          const r = Math.round(59 - 43 * pe)
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (running && !reduced) raf = requestAnimationFrame(draw)
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType === "touch") return
      const r = cv.getBoundingClientRect()
      hovering = true
      target.x = e.clientX - r.left
      target.y = e.clientY - r.top
      if (reduced) draw(performance.now())
    }
    function onLeave() {
      hovering = false // the wandering swell picks up from wherever the pointer left
      if (reduced) draw(performance.now())
    }
    function onVisibility() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduced) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) draw(performance.now())
    })
    ro.observe(parent)
    parent.addEventListener("pointermove", onMove, { passive: true })
    parent.addEventListener("pointerleave", onLeave)
    document.addEventListener("visibilitychange", onVisibility)
    if (reduced) draw(performance.now())
    else raf = requestAnimationFrame(draw)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      parent.removeEventListener("pointermove", onMove)
      parent.removeEventListener("pointerleave", onLeave)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={className} />
}
