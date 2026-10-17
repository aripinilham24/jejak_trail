import { hashString } from "@/lib/hash"

interface EventCoverProps {
  seed: string
  className?: string
  /** tinggi minimum; komponen akan mengisi parent jika `fill` */
  fill?: boolean
  label?: string
  compact?: boolean
}

/**
 * Karya sampul generatif: punggungan gunung, kontur topografi, dan matahari amber.
 * Deterministik dari `seed` (slug event) sehingga tiap event punya identitas visual.
 */
export function EventCover({ seed, className, fill, label, compact }: EventCoverProps) {
  const base = hashString(seed)
  const hue = base % 360
  const rand = mulberry(seed)

  const ridges = [
    { y: 0.62, amp: 0.16, opacity: 0.95, hueShift: 0 },
    { y: 0.72, amp: 0.13, opacity: 0.75, hueShift: -8 },
    { y: 0.8, amp: 0.1, opacity: 0.55, hueShift: -16 },
    { y: 0.88, amp: 0.07, opacity: 0.4, hueShift: -24 },
  ]

  const ridgePath = (y: number, amp: number, index: number) => {
    const points = 9
    let d = `M 0 100 L 0 ${(y * 100).toFixed(2)}`
    for (let i = 1; i <= points; i += 1) {
      const t = i / points
      const wave =
        Math.sin(t * Math.PI * (2 + index * 0.6) + rand() * 1.2) * amp * 100 * 0.5 +
        Math.sin(t * Math.PI * 5.3 + index) * amp * 100 * 0.18
      d += ` L ${(t * 100).toFixed(2)} ${(y * 100 + wave).toFixed(2)}`
    }
    d += " L 100 100 Z"
    return d
  }

  return (
    <div
      className={[
        "relative overflow-hidden bg-[#0a1a12]",
        fill ? "absolute inset-0" : "",
        className ?? "",
      ].join(" ")}
      aria-hidden={!label}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id={`sky-${base}`} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={`hsl(${(hue + 190) % 360} 42% 22%)`} />
            <stop offset="55%" stopColor={`hsl(${(hue + 160) % 360} 38% 12%)`} />
            <stop offset="100%" stopColor="#06120e" />
          </linearGradient>
          <radialGradient id={`sun-${base}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd479" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#f5a524" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f5a524" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`ridge-${base}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e2018" />
            <stop offset="100%" stopColor="#050f0c" />
          </linearGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#sky-${base})`} />

        {/* contour lines */}
        <g stroke="rgba(255,255,255,0.07)" strokeWidth="0.25" fill="none">
          {Array.from({ length: 9 }).map((_, i) => (
            <ellipse
              key={i}
              cx={12 + (i % 3) * 34}
              cy={74 + (i % 4) * 6}
              rx={14 + (i % 5) * 8}
              ry={5 + (i % 3) * 3}
            />
          ))}
        </g>

        <circle cx="74" cy="26" r="26" fill={`url(#sun-${base})`} />
        <circle cx="74" cy="26" r="7.5" fill="#f7c65a" opacity="0.9" />

        <g>
          {ridges.map((ridge, index) => (
            <path
              key={index}
              d={ridgePath(ridge.y, ridge.amp, index)}
              fill={`url(#ridge-${base})`}
              opacity={ridge.opacity}
              transform={`translate(0 ${index * 0.6})`}
            />
          ))}
        </g>

        {/* trail line */}
        <path
          d="M 4 92 C 24 84 30 70 44 66 C 58 62 66 50 78 46"
          stroke="rgba(245,165,36,0.55)"
          strokeWidth="0.5"
          strokeDasharray="2 2.2"
          fill="none"
        />
      </svg>

      {!compact && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,18,14,0.05) 0%, rgba(6,18,14,0.35) 55%, rgba(6,18,14,0.92) 100%)",
          }}
        />
      )}

      {label && (
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-300/80">
            {label}
          </p>
        </div>
      )}
    </div>
  )
}

function mulberry(seed: string) {
  let a = hashString(seed)
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
