"use client";

import { useMemo } from "react";
import { verifiedVenues, verifiedVenueMap } from "@/lib/data/venues-verified";
import type { TimetableSet } from "@/lib/data/timetable";
import { formatTime } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

const HEADER_HEIGHT = 48;
const TIME_COLUMN_WIDTH = 60;
const COLUMN_WIDTH = 120;
const MINUTE_HEIGHT = 2.4;
const ROW_GAP = 2;

interface ModernTimetableGridProps {
  sets: TimetableSet[];
  frameSets?: TimetableSet[];
  selectedIds?: Set<string>;
  onSelectSet?: (set: TimetableSet) => void;
  className?: string;
}

function getTokyoMinutes(ts: number): number {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(ts * 1000))
    .split(":")
    .map(Number);

  return parts[0] * 60 + parts[1];
}

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/**
 * Modern timetable grid matching official app styling
 * Features:
 * - Day/Time columns with venue rows
 * - Visual buffer time indicators
 * - Touch-friendly with hover states
 * - Performance information display
 */
export function ModernTimetableGrid({
  sets,
  frameSets,
  selectedIds,
  onSelectSet,
  className,
}: ModernTimetableGridProps) {
  const framingSets = frameSets && frameSets.length > 0 ? frameSets : sets;

  const visibleVenues = useMemo(() => {
    if (sets.length === 0) return verifiedVenues;
    const activeIds = new Set(sets.map((set) => set.venueId).filter(Boolean));
    return verifiedVenues.filter((venue) => activeIds.has(venue.id));
  }, [sets]);

  const venueIndex = useMemo(
    () => new Map(visibleVenues.map((venue, index) => [venue.id, index])),
    [visibleVenues]
  );

  const timeRange = useMemo(() => {
    if (framingSets.length === 0) {
      return {
        startMinutes: 13 * 60,
        endMinutes: 22 * 60,
        height: ((22 - 13) * 60) * MINUTE_HEIGHT,
      };
    }

    const startMinutes = floorToStep(
      Math.min(...framingSets.map((set) => getTokyoMinutes(set.startAt))),
      30
    );
    const endMinutes = ceilToStep(
      Math.max(...framingSets.map((set) => getTokyoMinutes(set.finishAt))),
      30
    );

    return {
      startMinutes,
      endMinutes,
      height: Math.max(480, (endMinutes - startMinutes) * MINUTE_HEIGHT),
    };
  }, [framingSets]);

  const hourLines = useMemo(() => {
    const lines: number[] = [];
    for (
      let minute = floorToStep(timeRange.startMinutes, 60);
      minute <= timeRange.endMinutes;
      minute += 60
    ) {
      lines.push(minute);
    }
    return lines;
  }, [timeRange.endMinutes, timeRange.startMinutes]);

  const hourHalfLines = useMemo(() => {
    const lines: number[] = [];
    for (
      let minute = floorToStep(timeRange.startMinutes, 60) + 30;
      minute < timeRange.endMinutes;
      minute += 60
    ) {
      lines.push(minute);
    }
    return lines;
  }, [timeRange.endMinutes, timeRange.startMinutes]);

  return (
    <div
      className={cn(
        "overflow-auto rounded-[28px] border border-zinc-800 bg-gradient-to-br from-[#050505] to-[#0a0a0a]",
        className
      )}
    >
      <div
        className="relative min-w-max"
        style={{
          width: TIME_COLUMN_WIDTH + visibleVenues.length * COLUMN_WIDTH,
          height: HEADER_HEIGHT + timeRange.height,
        }}
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-20 flex h-12 border-b border-zinc-800/80 bg-[#050505]/95 backdrop-blur">
          <div className="sticky left-0 z-30 w-[60px] border-r border-zinc-800/80 bg-gradient-to-r from-[#050505] to-transparent flex items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              TIME
            </span>
          </div>

          {visibleVenues.map((venue) => (
            <div
              key={venue.id}
              className="flex shrink-0 flex-col items-center justify-center border-r border-zinc-800/60 px-2 py-2 text-center"
              style={{
                width: COLUMN_WIDTH,
                borderLeftColor: venue.color,
                borderLeftWidth: "3px",
              }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full mb-1"
                style={{ backgroundColor: venue.color }}
              />
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300 line-clamp-2">
                {venue.name.split(" ")[0]}
              </div>
              <div className="text-[8px] text-zinc-500 uppercase tracking-[0.08em]">
                {venue.area}
              </div>
            </div>
          ))}
        </div>

        {/* Grid Background */}
        <div className="absolute inset-x-0 top-12 bottom-0">
          {/* Venue column separators */}
          {visibleVenues.map((venue, index) => (
            <div
              key={`col-${venue.id}`}
              className="absolute top-0 bottom-0 border-r border-zinc-900/40"
              style={{
                left: TIME_COLUMN_WIDTH + index * COLUMN_WIDTH,
                width: COLUMN_WIDTH,
              }}
            />
          ))}

          {/* Hour lines (major) */}
          {hourLines.map((minute) => {
            const top = (minute - timeRange.startMinutes) * MINUTE_HEIGHT;
            const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:00`;

            return (
              <div key={`hour-${minute}`}>
                <div
                  className="absolute left-0 right-0 border-t border-zinc-800"
                  style={{ top }}
                />
                <div className="sticky left-0 z-10 flex h-0 w-[60px] justify-center">
                  <span className="translate-y-[-9px] rounded-full bg-[#050505] px-1.5 text-[9px] font-semibold text-zinc-400">
                    {label}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Hour half lines (minor) */}
          {hourHalfLines.map((minute) => {
            const top = (minute - timeRange.startMinutes) * MINUTE_HEIGHT;
            return (
              <div
                key={`half-${minute}`}
                className="absolute left-0 right-0 border-t border-dashed border-zinc-900/50"
                style={{ top }}
              />
            );
          })}

          {/* Performance blocks */}
          {sets.map((set) => {
            if (!set.venueId || !venueIndex.has(set.venueId)) {
              return null;
            }

            const venueDex = venueIndex.get(set.venueId)!;
            const startMin = getTokyoMinutes(set.startAt);
            const endMin = getTokyoMinutes(set.finishAt);
            const top = (startMin - timeRange.startMinutes) * MINUTE_HEIGHT;
            const height = (endMin - startMin) * MINUTE_HEIGHT;
            const isSelected = selectedIds?.has(set.id);
            const venue = verifiedVenueMap.get(set.venueId);

            return (
              <div
                key={set.id}
                className="absolute"
                style={{
                  left: TIME_COLUMN_WIDTH + venueDex * COLUMN_WIDTH + 2,
                  width: COLUMN_WIDTH - 4,
                  top: `calc(3rem + ${top}px)`,
                  height: `${Math.max(20, height)}px`,
                }}
              >
                <button
                  onClick={() => onSelectSet?.(set)}
                  className={cn(
                    "w-full h-full rounded-lg border-2 transition-all cursor-pointer overflow-hidden group",
                    "hover:shadow-lg hover:scale-[1.02] active:scale-95",
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/15 shadow-lg shadow-cyan-500/20"
                      : "border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700/80"
                  )}
                  style={{
                    borderColor: isSelected ? venue?.color : undefined,
                    backgroundColor: isSelected
                      ? `${venue?.color}20`
                      : undefined,
                  }}
                >
                  <div className="px-1.5 py-1 text-left h-full flex flex-col justify-center">
                    <div
                      className={cn(
                        "text-[10px] font-bold tracking-tight line-clamp-2 transition-colors",
                        isSelected ? "text-cyan-300" : "text-zinc-200"
                      )}
                    >
                      {set.artistName}
                    </div>
                    <div className="text-[7px] text-zinc-500 uppercase tracking-[0.06em] line-clamp-1 mt-0.5">
                      {formatTime(set.startAt)}-{formatTime(set.finishAt)}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1 right-1 text-cyan-400">
                      <Heart className="h-2.5 w-2.5 fill-current" />
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ModernTimetableGrid;
