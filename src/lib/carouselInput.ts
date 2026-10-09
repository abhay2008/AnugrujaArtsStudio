/** Ignore diagonal jitter until a deliberate horizontal swipe is established. */
export function gestureDirection(dx: number, dy: number): 'pending' | 'horizontal' | 'vertical' {
  if (Math.hypot(dx, dy) <= 8) return 'pending';
  return Math.abs(dx) > Math.abs(dy) * 1.5 ? 'horizontal' : 'vertical';
}

/** One slide per wheel gesture, including its momentum tail; vertical intent stays locked. */
export function createWheelNavigator() {
  let lastTime = -Infinity;
  let axis: 'horizontal' | 'vertical' | null = null;
  let accumulated = 0;
  let advanced = false;

  return (deltaX: number, deltaY: number, deltaMode: number, now: number, pageSize: number) => {
    if (now - lastTime > 200) {
      axis = null;
      accumulated = 0;
      advanced = false;
    }
    lastTime = now;
    const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? pageSize : 1;
    const x = deltaX * unit;
    const y = deltaY * unit;
    if (axis === null) {
      if (Math.abs(x) + Math.abs(y) < 2) return { horizontal: false, step: 0 };
      axis = Math.abs(x) > Math.abs(y) * 1.5 ? 'horizontal' : 'vertical';
    }
    if (axis === 'vertical') return { horizontal: false, step: 0 };
    accumulated += x;
    if (!advanced && Math.abs(accumulated) >= 56) {
      advanced = true;
      return { horizontal: true, step: accumulated > 0 ? 1 : -1 };
    }
    return { horizontal: true, step: 0 };
  };
}
