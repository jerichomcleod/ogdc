export type Action =
  | 'MOVE_FORWARD'
  | 'MOVE_BACK'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
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
  KeyE:       'INTERACT',
  Space:      'INTERACT',
  KeyI:       'OPEN_INVENTORY',
  KeyM:       'OPEN_MAP',
  Enter:      'CONFIRM',
  Escape:     'CANCEL',
}

// Pending one-shot actions to be consumed this frame
const _queue = new Set<Action>()

// Debounce: track when each action was last consumed to prevent key-repeat spam
const _lastConsumed: Partial<Record<Action, number>> = {}
const MOVE_COOLDOWN_MS = 150

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    const action = KEY_MAP[e.code]
    if (!action) return
    e.preventDefault()

    const now = Date.now()
    const last = _lastConsumed[action] ?? 0
    if (now - last >= MOVE_COOLDOWN_MS) {
      _queue.add(action)
    }
  })
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
