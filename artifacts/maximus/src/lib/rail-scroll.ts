/** Horizontal scroll offset that centres a chip inside its own rail, clamped to the scrollable range. */
export function railScrollTarget(rail: { width: number; scrollWidth: number }, item: { left: number; width: number }): number {
  const centred = item.left - (rail.width - item.width) / 2;
  return Math.max(0, Math.min(centred, Math.max(0, rail.scrollWidth - rail.width)));
}
