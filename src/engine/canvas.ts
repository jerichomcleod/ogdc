import { CANVAS_W, CANVAS_H } from '../constants'

let _canvas: HTMLCanvasElement
let _ctx: CanvasRenderingContext2D

export function initCanvas(): void {
  _canvas = document.getElementById('game-canvas') as HTMLCanvasElement
  _canvas.width = CANVAS_W
  _canvas.height = CANVAS_H

  const ctx = _canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D context')
  _ctx = ctx

  // Scale canvas CSS size to fit the window while keeping aspect ratio
  scaleToWindow()
  window.addEventListener('resize', scaleToWindow)
}

function scaleToWindow(): void {
  const controls  = document.getElementById('controls')
  const app       = document.getElementById('app')
  const controlsH = controls?.offsetHeight ?? 220
  const availH    = window.innerHeight - controlsH
  const scale     = Math.min(window.innerWidth / CANVAS_W, availH / CANVAS_H)
  const clamped   = Math.max(0.4, scale)
  const cssW = Math.floor(CANVAS_W * clamped)
  const cssH = Math.floor(CANVAS_H * clamped)
  _canvas.style.width  = `${cssW}px`
  _canvas.style.height = `${cssH}px`
  // Keep controls the same width as the scaled canvas
  if (app) app.style.width = `${cssW}px`
  // Prevent vertical layout from collapsing below canvas + controls
  document.body.style.minHeight = `${cssH + controlsH + 20}px`
}

export function getCtx(): CanvasRenderingContext2D {
  return _ctx
}

export function clear(): void {
  _ctx.fillStyle = '#000'
  _ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}
