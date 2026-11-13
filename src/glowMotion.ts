export function approach(current: number, target: number, elapsed: number, duration: number) {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, elapsed) / Math.max(1, duration)));
}

export function envelope(current: number, target: number, elapsed: number, fade: number) {
  // Quick attack and gentle release, independent of the screen refresh rate.
  const duration = target > current ? Math.max(65, fade * 0.16) : Math.max(180, fade * 0.8);
  return approach(current, target, elapsed, duration);
}
