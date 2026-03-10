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
  const scale = Math.min(
    window.innerWidth / CANVAS_W,
    window.innerHeight / CANVAS_H
  )
  _canvas.style.width = `${CANVAS_W * scale}px`
  _canvas.style.height = `${CANVAS_H * scale}px`
}

export function getCtx(): CanvasRenderingContext2D {
  return _ctx
}

export function clear(): void {
  _ctx.fillStyle = '#000'
  _ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
}
