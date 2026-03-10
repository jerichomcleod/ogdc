/**
 * On-screen button controller.
 *
 * Reads data-action attributes from button elements and wires them to
 * fireAction().  Directional buttons support hold-to-repeat.
 */

import { fireAction, Action } from '../engine/input'

// Delay before repeat starts, then interval between repeats
const HOLD_DELAY_MS  = 280
const HOLD_REPEAT_MS = 140

// Actions that repeat while held (directional only)
const REPEATING = new Set<Action>(['MOVE_FORWARD', 'MOVE_BACK', 'TURN_LEFT', 'TURN_RIGHT'])

function bindButton(el: HTMLElement, action: Action): void {
  let holdTimer:   ReturnType<typeof setTimeout>  | null = null
  let repeatTimer: ReturnType<typeof setInterval> | null = null

  function press(e: Event): void {
    e.preventDefault()
    fireAction(action)
    el.classList.add('pressed')

    if (REPEATING.has(action)) {
      holdTimer = setTimeout(() => {
        repeatTimer = setInterval(() => fireAction(action), HOLD_REPEAT_MS)
      }, HOLD_DELAY_MS)
    }
  }

  function release(): void {
    el.classList.remove('pressed')
    if (holdTimer)   { clearTimeout(holdTimer);   holdTimer   = null }
    if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null }
  }

  el.addEventListener('mousedown',   press)
  el.addEventListener('touchstart',  press,   { passive: false })
  el.addEventListener('mouseup',     release)
  el.addEventListener('mouseleave',  release)
  el.addEventListener('touchend',    release)
  el.addEventListener('touchcancel', release)
  // Prevent context menu on long-press
  el.addEventListener('contextmenu', (e) => e.preventDefault())
}

export function initControls(): void {
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(el => {
    const action = el.dataset.action as Action | undefined
    if (action) bindButton(el, action)
  })
}
