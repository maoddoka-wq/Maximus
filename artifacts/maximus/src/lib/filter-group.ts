/** Number of filters whose value differs from their neutral ("no filter") value. */
export function countActiveFilters(filters: ReadonlyArray<readonly [value: string, neutral: string]>): number {
  return filters.filter(([value, neutral]) => value !== neutral).length;
}

export function filterToggleLabel(label: string, activeCount: number): string {
  return activeCount > 0 ? `${label} (${activeCount})` : label;
}
