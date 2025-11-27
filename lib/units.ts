// lib/units.ts
export function m2ToFt2(m2: number | null | undefined): number | null {
  if (m2 == null) return null
  return Math.round(m2 * 10.7639)
}
