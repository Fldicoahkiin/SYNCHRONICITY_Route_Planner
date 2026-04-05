import { getWalkMinutes } from "@/lib/data/walking-matrix";
import type { TimetableSet } from "@/lib/data/timetable";

export interface RouteLeg {
  set: TimetableSet;
  nextSet?: TimetableSet;
  walkMinutes: number;
  bufferMinutes: number; // time remaining after arriving at next venue
  status: "comfortable" | "just-right" | "tight" | "impossible";
}

export interface PlannedRoute {
  day: 1 | 2;
  legs: RouteLeg[];
  totalSets: number;
  impossibleLegs: number;
  averageBuffer: number;
}

export function planRoute(
  favorites: TimetableSet[],
  day: 1 | 2,
): PlannedRoute {
  const sets = favorites
    .filter((s) => s.day === day)
    .sort((a, b) => a.startAt - b.startAt);

  const legs: RouteLeg[] = [];
  let impossibleLegs = 0;
  let totalBuffer = 0;

  for (let i = 0; i < sets.length; i++) {
    const current = sets[i];
    const next = sets[i + 1];

    if (!next) {
      legs.push({
        set: current,
        walkMinutes: 0,
        bufferMinutes: Infinity,
        status: "comfortable",
      });
      continue;
    }

    const walk = current.venueId && next.venueId
      ? getWalkMinutes(current.venueId, next.venueId)
      : 10;

    const buffer = next.startAt - current.finishAt - walk * 60;
    const bufferMinutes = Math.round(buffer / 60);

    let status: RouteLeg["status"] = "comfortable";
    if (bufferMinutes < 0) {
      status = "impossible";
      impossibleLegs++;
    } else if (bufferMinutes <= 5) {
      status = "tight";
    } else if (bufferMinutes <= 15) {
      status = "just-right";
    }

    if (bufferMinutes > 0 && bufferMinutes !== Infinity) {
      totalBuffer += bufferMinutes;
    }

    legs.push({
      set: current,
      nextSet: next,
      walkMinutes: walk,
      bufferMinutes,
      status,
    });
  }

  const averageBuffer =
    legs.length > 1 ? totalBuffer / (legs.length - 1) : 0;

  return {
    day,
    legs,
    totalSets: sets.length,
    impossibleLegs,
    averageBuffer,
  };
}

export function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const s = d.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
  return s;
}
