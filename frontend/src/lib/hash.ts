/** Hash FNV-1a sederhana, dipakai untuk membuat data & warna deterministik. */
export function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Rentang hue yang selaras dengan palet amber–forest. */
export function brandHue(seed: string): number {
  const h = hashString(seed) % 100
  return 18 + Math.round(h * 0.9)
}
