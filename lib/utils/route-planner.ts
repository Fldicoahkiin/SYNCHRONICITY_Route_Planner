import { getWalkMinutes } from "@/lib/data/walking-matrix";
import type { TimetableSet } from "@/lib/data/timetable";

export type TravelSource = "same-venue" | "route-api" | "matrix";

export interface RouteTravelOverride {
  minutes: number;
  distanceMeters?: number;
  geometry?: [number, number][];
  source: TravelSource;
}

export interface RouteLeg {
  set: TimetableSet;
  nextSet?: TimetableSet;
  walkMinutes: number;
  gapMinutes: number;
  bufferMinutes: number; // time remaining after arriving at next venue
  distanceMeters?: number;
  geometry?: [number, number][];
  travelSource: TravelSource;
  status: "comfortable" | "just-right" | "tight" | "impossible";
}

export interface PlannedRoute {
  day: 1 | 2;
  legs: RouteLeg[];
  totalSets: number;
  impossibleLegs: number;
  averageBuffer: number;
}

export function getRouteLegKey(currentSetId: string, nextSetId: string): string {
  return `${currentSetId}->${nextSetId}`;
}

export function planRoute(
  favorites: TimetableSet[],
  day: 1 | 2,
  travelOverrides: Record<string, RouteTravelOverride> = {},
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
        gapMinutes: 0,
        bufferMinutes: Infinity,
        travelSource: "same-venue",
        status: "comfortable",
      });
      continue;
    }

    const legKey = getRouteLegKey(current.id, next.id);
    const override = travelOverrides[legKey];
    const sameVenue =
      current.venueId &&
      next.venueId &&
      current.venueId === next.venueId;
    const walk = sameVenue
      ? 0
      : override?.minutes ??
        (current.venueId && next.venueId
          ? getWalkMinutes(current.venueId, next.venueId)
          : 10);

    const gapMinutes = Math.round((next.startAt - current.finishAt) / 60);
    const bufferMinutes = gapMinutes - walk;

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
      gapMinutes,
      bufferMinutes,
      distanceMeters: override?.distanceMeters,
      geometry: override?.geometry,
      travelSource: sameVenue ? "same-venue" : override?.source ?? "matrix",
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
