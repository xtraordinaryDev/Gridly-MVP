import { useId } from "react"

import { cn } from "@/lib/utils"

/**
 * GridLink brand mark — "Fuel Grid": a fuel drop with a delivery grid inside
 * it and one verified node. Colors are fixed per tone (not themeable) so the
 * mark reads the same everywhere it appears.
 *
 *   light — on white / light surfaces
 *   dark  — on navy
 *   tile  — white mark for the blue app-icon tile
 */
export type LogoTone = "light" | "dark" | "tile"

const TONES: Record<LogoTone, { grid: string; gridOpacity?: number; outline: string; nodeRing: string }> = {
  light: { grid: "#3B82F6", outline: "#0A2540", nodeRing: "#FFFFFF" },
  dark: { grid: "#60A5FA", outline: "#FFFFFF", nodeRing: "#0A2540" },
  tile: { grid: "#FFFFFF", gridOpacity: 0.6, outline: "#FFFFFF", nodeRing: "#3B82F6" },
}

const DROP = "M32 5C32 5 11 27 11 40a21 21 0 0 0 42 0C53 27 32 5 32 5Z"

export function GridLinkMark({
  tone = "light",
  className,
  title,
}: {
  tone?: LogoTone
  className?: string
  /** Accessible name. Omit when the mark sits next to the wordmark. */
  title?: string
}) {
  const clipId = useId()
  const c = TONES[tone]
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={DROP} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} stroke={c.grid} strokeWidth="3.5" opacity={c.gridOpacity}>
        <path d="M24 0V64M40 0V64M0 33H64M0 46H64" />
      </g>
      <path d={DROP} fill="none" stroke={c.outline} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="40" cy="46" r="5.5" fill="#10B981" stroke={c.nodeRing} strokeWidth="2" />
    </svg>
  )
}

const SIZES = {
  sm: { mark: "size-6", text: "text-base", gap: "gap-1.5" },
  md: { mark: "size-7", text: "text-lg", gap: "gap-2" },
  lg: { mark: "size-10", text: "text-2xl", gap: "gap-2.5" },
} as const

/** Mark + wordmark lockup. `tone="dark"` for navy surfaces. */
export function GridLinkLogo({
  tone = "light",
  size = "md",
  className,
}: {
  tone?: Exclude<LogoTone, "tile">
  size?: keyof typeof SIZES
  className?: string
}) {
  const s = SIZES[size]
  return (
    <span className={cn("inline-flex items-center", s.gap, className)}>
      <GridLinkMark tone={tone} className={s.mark} />
      <span
        className={cn("font-extrabold leading-none tracking-[-0.035em]", s.text, tone === "dark" ? "text-white" : "text-navy")}
        style={{ fontFamily: "var(--font-brand), var(--font-sans), system-ui, sans-serif" }}
      >
        Grid<span className={tone === "dark" ? "text-[#60A5FA]" : "text-brand-blue"}>Link</span>
      </span>
    </span>
  )
}
