"use client"

import { useMemo, useState } from "react"

import { US_TILE_LAYOUT } from "@/lib/directory/us-tile-layout"
import { ABBREV_TO_STATE_NAME, STATE_NAME_TO_ABBREV } from "@/lib/directory/state-abbrev"
import { cn } from "@/lib/utils"

const CELL = 36
const GAP = 2
const PAD = 8

export function CoverageUsMap({ licensedStates }: { licensedStates: string[] }) {
  const [hovered, setHovered] = useState<string | null>(null)

  const licensedAbbrevs = useMemo(() => {
    const set = new Set<string>()
    for (const name of licensedStates) {
      const abbr = STATE_NAME_TO_ABBREV[name]
      if (abbr) set.add(abbr)
    }
    return set
  }, [licensedStates])

  const maxCol = Math.max(...US_TILE_LAYOUT.map((s) => s.col))
  const maxRow = Math.max(...US_TILE_LAYOUT.map((s) => s.row))
  const width = PAD * 2 + (maxCol + 1) * (CELL + GAP)
  const height = PAD * 2 + (maxRow + 1) * (CELL + GAP)

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto w-full max-w-xl"
        role="img"
        aria-label="United States coverage map"
      >
        {US_TILE_LAYOUT.map(({ abbrev, col, row }) => {
          const licensed = licensedAbbrevs.has(abbrev)
          const name = ABBREV_TO_STATE_NAME[abbrev] ?? abbrev
          const x = PAD + col * (CELL + GAP)
          const y = PAD + row * (CELL + GAP)
          const active = hovered === abbrev

          return (
            <g
              key={abbrev}
              onMouseEnter={() => setHovered(abbrev)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={4}
                className={cn(
                  "cursor-default stroke-white stroke-[1.5] transition-colors",
                  licensed ? "fill-brand-blue" : "fill-muted",
                  active && licensed && "fill-brand-blue/80",
                  active && !licensed && "fill-muted-foreground/30"
                )}
              />
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 4}
                textAnchor="middle"
                className={cn(
                  "pointer-events-none select-none text-[9px] font-semibold",
                  licensed ? "fill-white" : "fill-muted-foreground"
                )}
              >
                {abbrev}
              </text>
              <title>{name}</title>
            </g>
          )
        })}
      </svg>
      {hovered ? (
        <p className="text-center text-sm font-medium text-navy">
          {ABBREV_TO_STATE_NAME[hovered] ?? hovered}
          {licensedAbbrevs.has(hovered) ? (
            <span className="ml-2 text-brand-blue">· Licensed</span>
          ) : null}
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Hover a state for details · Blue = licensed
        </p>
      )}
    </div>
  )
}
