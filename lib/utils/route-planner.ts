import { getWalkMinutes } from "@/lib/data/walking-matrix";
import type { TimetableSet } from "@/lib/data/timetable";

export type TravelSource = "same-venue" | "route-api" | "matrix" | "local-cache";

type RouteStatus = "comfortable" | "just-right" | "tight" | "impossible";
type ConflictSelectionInput = Record<string, string[]>;

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
  bufferMinutes: number;
  distanceMeters?: number;
  geometry?: [number, number][];
  travelSource: TravelSource;
  status: RouteStatus;
}

export interface ConflictTransferPreview {
  kind: "resolved" | "depends-on-adjacent" | "none";
  referencePerformance?: TimetableSet;
  walkMinutes?: number;
  gapMinutes?: number;
  bufferMinutes?: number;
  distanceMeters?: number;
  source?: TravelSource;
  status?: RouteStatus;
}

export interface ConflictOptionPreview {
  performanceId: string;
  before: ConflictTransferPreview;
  after: ConflictTransferPreview;
}

export interface ConflictGroup {
  id: string;
  performanceIds: string[];
  performances: TimetableSet[];
  timeRanges: Array<{
    performanceId: string;
    startAt: number;
    finishAt: number;
  }>;
  selectedPerformanceIds: string[];
  optionPreviews: ConflictOptionPreview[];
}

interface RouteSummary {
  day: 1 | 2;
  legs: RouteLeg[];
  totalSets: number;
  impossibleLegs: number;
  averageBuffer: number;
  tightLegs: number;
  justRightLegs: number;
  comfortableLegs: number;
}

export interface PlannedRoute extends RouteSummary {
  conflictGroups: ConflictGroup[];
}

const EMPTY_PREVIEW: ConflictTransferPreview = { kind: "none" };

export function getRouteLegKey(currentSetId: string, nextSetId: string): string {
  return `${currentSetId}->${nextSetId}`;
}

export function planRoute(
  favorites: TimetableSet[],
  day: 1 | 2,
  travelOverrides: Record<string, RouteTravelOverride> = {},
  conflictSelections: ConflictSelectionInput = {},
): PlannedRoute {
  const sets = favorites
    .filter((set) => set.day === day)
    .sort(compareSets);

  const rawConflictGroups = detectConflictGroups(sets);
  const groupIdByPerformance = new Map<string, string>();

  for (const group of rawConflictGroups) {
    for (const performanceId of group.performanceIds) {
      groupIdByPerformance.set(performanceId, group.id);
    }
  }

  const conflictGroups = rawConflictGroups.map((group) => {
    const optionPreviews = buildConflictOptionPreviews(
      group,
      sets,
      groupIdByPerformance,
      travelOverrides,
    );

    // Order performances in the group by shortest transfer time from previous scheduled set
    const walkMap = new Map(optionPreviews.map((p) => [p.performanceId, p.before.kind === "resolved" ? p.before.walkMinutes ?? Infinity : Infinity]));

    const sortedPerformances = [...group.performances].sort((a, b) => {
      const aw = walkMap.get(a.id) ?? Infinity;
      const bw = walkMap.get(b.id) ?? Infinity;
      if (aw !== bw) return aw - bw;
      return compareSets(a, b);
    });

    const normalizedSelection = getNormalizedSelection({ ...group, performances: sortedPerformances }, conflictSelections[group.id]);

    return {
      ...group,
      performances: sortedPerformances,
      selectedPerformanceIds: normalizedSelection,
      optionPreviews,
    };
  });

  const groupedPerformanceIds = new Set(groupIdByPerformance.keys());
  const nonConflictSets = sets.filter((set) => !groupedPerformanceIds.has(set.id));

  const selectedSets = [
    ...nonConflictSets,
    ...conflictGroups
      .flatMap((group) => {
        const selectedIds = getNormalizedSelection(group, conflictSelections[group.id]);
        return selectedIds
          .map((id) => group.performances.find((p) => p.id === id))
          .filter((p): p is TimetableSet => Boolean(p));
      }),
  ].sort(compareSets);

  return {
    ...summarizeRoute(day, selectedSets, travelOverrides),
    conflictGroups,
  };
}

export function detectConflictGroups(sets: TimetableSet[]): ConflictGroup[] {
  const sortedSets = [...sets].sort(compareSets);
  const conflicts: ConflictGroup[] = [];

  for (let index = 0; index < sortedSets.length; ) {
    const current = sortedSets[index];
    const groupPerformances = [current];
    let groupFinishAt = current.finishAt;
    let nextIndex = index + 1;

    while (
      nextIndex < sortedSets.length &&
      sortedSets[nextIndex].startAt < groupFinishAt
    ) {
      const next = sortedSets[nextIndex];
      groupPerformances.push(next);
      groupFinishAt = Math.max(groupFinishAt, next.finishAt);
      nextIndex += 1;
    }

    if (groupPerformances.length > 1) {
      const performanceIds = groupPerformances.map((performance) => performance.id).sort();
      conflicts.push({
        id: getConflictGroupId(performanceIds),
        performanceIds,
        performances: [...groupPerformances].sort(compareSets),
        timeRanges: groupPerformances.map((performance) => ({
          performanceId: performance.id,
          startAt: performance.startAt,
          finishAt: performance.finishAt,
        })),
        selectedPerformanceIds: performanceIds,
        optionPreviews: [],
      });
    }

    index = nextIndex;
  }

  return conflicts;
}

export function formatTime(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
}

function summarizeRoute(
  day: 1 | 2,
  sets: TimetableSet[],
  travelOverrides: Record<string, RouteTravelOverride>,
): RouteSummary {
  const legs: RouteLeg[] = [];
  let impossibleLegs = 0;
  let tightLegs = 0;
  let justRightLegs = 0;
  let comfortableLegs = 0;
  let totalBuffer = 0;

  for (let index = 0; index < sets.length; index += 1) {
    const current = sets[index];
    const next = sets[index + 1];

    if (!next) {
      legs.push({
        set: current,
        walkMinutes: 0,
        gapMinutes: 0,
        bufferMinutes: Number.POSITIVE_INFINITY,
        travelSource: "same-venue",
        status: "comfortable",
      });
      continue;
    }

    const transfer = resolveTransfer(current, next, travelOverrides);

    if (transfer.status === "impossible") {
      impossibleLegs += 1;
    } else if (transfer.status === "tight") {
      tightLegs += 1;
    } else if (transfer.status === "just-right") {
      justRightLegs += 1;
    } else {
      comfortableLegs += 1;
    }

    // Include negative buffers so the average reflects impossible/tight transitions as well
    totalBuffer += transfer.bufferMinutes;

    legs.push({
      set: current,
      nextSet: next,
      walkMinutes: transfer.walkMinutes,
      gapMinutes: transfer.gapMinutes,
      bufferMinutes: transfer.bufferMinutes,
      distanceMeters: transfer.distanceMeters,
      geometry: transfer.geometry,
      travelSource: transfer.source,
      status: transfer.status,
    });
  }

  const transitionCount = Math.max(0, sets.length - 1);
  const averageBuffer = transitionCount > 0 ? totalBuffer / transitionCount : 0;

  return {
    day,
    legs,
    totalSets: sets.length,
    impossibleLegs,
    averageBuffer,
    tightLegs,
    justRightLegs,
    comfortableLegs,
  };
}

function buildConflictOptionPreviews(
  group: ConflictGroup,
  sets: TimetableSet[],
  groupIdByPerformance: Map<string, string>,
  travelOverrides: Record<string, RouteTravelOverride>,
): ConflictOptionPreview[] {
  const indexByPerformance = new Map(sets.map((set, index) => [set.id, index]));

  return group.performances.map((performance) => {
    const index = indexByPerformance.get(performance.id) ?? -1;

    return {
      performanceId: performance.id,
      before: resolveConflictPreview(
        sets,
        index,
        performance,
        group.id,
        "before",
        groupIdByPerformance,
        travelOverrides,
      ),
      after: resolveConflictPreview(
        sets,
        index,
        performance,
        group.id,
        "after",
        groupIdByPerformance,
        travelOverrides,
      ),
    };
  });
}

function resolveConflictPreview(
  sets: TimetableSet[],
  performanceIndex: number,
  performance: TimetableSet,
  currentGroupId: string,
  direction: "before" | "after",
  groupIdByPerformance: Map<string, string>,
  travelOverrides: Record<string, RouteTravelOverride>,
): ConflictTransferPreview {
  const step = direction === "before" ? -1 : 1;

  for (
    let cursor = performanceIndex + step;
    cursor >= 0 && cursor < sets.length;
    cursor += step
  ) {
    const candidate = sets[cursor];
    const candidateGroupId = groupIdByPerformance.get(candidate.id);

    if (candidateGroupId === currentGroupId) {
      continue;
    }

    if (candidateGroupId) {
      return {
        kind: "depends-on-adjacent",
        referencePerformance: candidate,
      };
    }

    return direction === "before"
      ? toConflictPreview(resolveTransfer(candidate, performance, travelOverrides), candidate)
      : toConflictPreview(resolveTransfer(performance, candidate, travelOverrides), candidate);
  }

  return EMPTY_PREVIEW;
}

function toConflictPreview(
  transfer: ResolvedTransfer,
  referencePerformance: TimetableSet,
): ConflictTransferPreview {
  return {
    kind: "resolved",
    referencePerformance,
    walkMinutes: transfer.walkMinutes,
    gapMinutes: transfer.gapMinutes,
    bufferMinutes: transfer.bufferMinutes,
    distanceMeters: transfer.distanceMeters,
    source: transfer.source,
    status: transfer.status,
  };
}

interface ResolvedTransfer {
  walkMinutes: number;
  gapMinutes: number;
  bufferMinutes: number;
  distanceMeters?: number;
  geometry?: [number, number][];
  source: TravelSource;
  status: RouteStatus;
}

function resolveTransfer(
  from: TimetableSet,
  to: TimetableSet,
  travelOverrides: Record<string, RouteTravelOverride>,
): ResolvedTransfer {
  const legKey = getRouteLegKey(from.id, to.id);
  const override = travelOverrides[legKey];
  const sameVenue = from.venueId && to.venueId && from.venueId === to.venueId;
  const walkMinutes = sameVenue
    ? 0
    : override?.minutes ??
      (from.venueId && to.venueId ? getWalkMinutes(from.venueId, to.venueId) : 10);
  const gapMinutes = Math.round((to.startAt - from.finishAt) / 60);
  const bufferMinutes = gapMinutes - walkMinutes;

  return {
    walkMinutes,
    gapMinutes,
    bufferMinutes,
    distanceMeters: override?.distanceMeters,
    geometry: override?.geometry,
    source: sameVenue ? "same-venue" : override?.source ?? "matrix",
    status: getRouteStatus(bufferMinutes),
  };
}

function getRouteStatus(bufferMinutes: number): RouteStatus {
  if (bufferMinutes < 0) {
    return "impossible";
  }
  if (bufferMinutes <= 5) {
    return "tight";
  }
  if (bufferMinutes <= 15) {
    return "just-right";
  }
  return "comfortable";
}

function getNormalizedSelection(
  group: ConflictGroup,
  selectedIds: string[] | undefined,
): string[] {
  const allowed = new Set(group.performanceIds);
  const orderedPerformanceIds = group.performances.map((performance) => performance.id);

  if (!selectedIds) {
    return orderedPerformanceIds;
  }

  const nextSelection = Array.from(new Set(selectedIds)).filter((performanceId) =>
    allowed.has(performanceId),
  );

  return orderedPerformanceIds.filter((performanceId) =>
    nextSelection.includes(performanceId),
  );
}

function getConflictGroupId(performanceIds: string[]): string {
  return `conflict:${performanceIds.join("-")}`;
}

function compareSets(a: TimetableSet, b: TimetableSet): number {
  if (a.startAt !== b.startAt) {
    return a.startAt - b.startAt;
  }
  if (a.finishAt !== b.finishAt) {
    return a.finishAt - b.finishAt;
  }
  return a.id.localeCompare(b.id);
}
