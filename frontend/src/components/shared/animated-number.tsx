import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number
  duration?: number
  format?: (value: number) => string
  className?: string
}

export function AnimatedNumber({ value, duration = 1200, format, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const frame = useRef<number>(0)
  const started = useRef(false)
  const elementRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = elementRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || started.current) return
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(Math.round(value * eased))
          if (progress < 1) frame.current = requestAnimationFrame(tick)
        }
        frame.current = requestAnimationFrame(tick)
      },
      { threshold: 0.3 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [duration, value])

  return (
    <span ref={elementRef} className={className}>
      {format ? format(display) : display.toLocaleString("id-ID")}
    </span>
  )
}
