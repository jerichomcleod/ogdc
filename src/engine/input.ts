export type Action =
  | 'MOVE_FORWARD'
  | 'MOVE_BACK'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'ATTACK'
  | 'USE_ITEM'
  | 'INTERACT'
  | 'OPEN_INVENTORY'
  | 'OPEN_MAP'
  | 'CONFIRM'
  | 'CANCEL'

const KEY_MAP: Record<string, Action> = {
  ArrowUp:    'MOVE_FORWARD',
  KeyW:       'MOVE_FORWARD',
  ArrowDown:  'MOVE_BACK',
  KeyS:       'MOVE_BACK',
  ArrowLeft:  'TURN_LEFT',
  KeyA:       'TURN_LEFT',
  ArrowRight: 'TURN_RIGHT',
  KeyD:       'TURN_RIGHT',
  KeyF:       'ATTACK',
  Space:      'ATTACK',
  KeyQ:       'USE_ITEM',
  KeyE:       'INTERACT',
  KeyI:       'OPEN_INVENTORY',
  KeyM:       'OPEN_MAP',
  Enter:      'CONFIRM',
  Escape:     'CANCEL',
}

const _queue: Set<Action>                          = new Set()
const _lastConsumed: Partial<Record<Action, number>> = {}
const COOLDOWN_MS = 150

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    const action = KEY_MAP[e.code]
    if (!action) return
    e.preventDefault()
    fireAction(action)
  })
}

/** Fire an action directly — used by on-screen buttons. */
export function fireAction(action: Action): void {
  const now  = Date.now()
  const last = _lastConsumed[action] ?? 0
  if (now - last >= COOLDOWN_MS) {
    _queue.add(action)
  }
}

export function consumeAction(action: Action): boolean {
  if (_queue.has(action)) {
    _queue.delete(action)
    _lastConsumed[action] = Date.now()
    return true
  }
  return false
}

export function flushInput(): void {
  _queue.clear()
}
