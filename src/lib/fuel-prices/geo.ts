/**
 * Coarse geographic grid used to share station lookups between nearby sites.
 * 0.07° of latitude ≈ 4.8 miles; a cell is roughly 5 mi × 4 mi in the lower 48.
 */
export const CELL_DEG = 0.07

export function cellFor(lat: number, lng: number): string {
  return `${Math.floor(lat / CELL_DEG)}:${Math.floor(lng / CELL_DEG)}`
}

export function cellCenter(cell: string): { lat: number; lng: number } {
  const [i, j] = cell.split(":").map(Number)
  return { lat: (i + 0.5) * CELL_DEG, lng: (j + 0.5) * CELL_DEG }
}

/** The cell plus its 8 neighbours — what to search when listing stations near a site. */
export function neighborCells(cell: string): string[] {
  const [i, j] = cell.split(":").map(Number)
  const out: string[] = []
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) out.push(`${i + di}:${j + dj}`)
  return out
}

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}
