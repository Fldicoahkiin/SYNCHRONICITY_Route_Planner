import { describe, expect, it } from "vitest";
import type { TimetableSet } from "../lib/data/timetable";
import { detectConflictGroups, planRoute } from "../lib/utils/route-planner";

const base = 1680000000;

function buildSet(
  id: string,
  venueId: string,
  startAtOffsetSeconds: number,
  finishAtOffsetSeconds: number,
): TimetableSet {
  return {
    id,
    artistId: id,
    artistName: id,
    stageId: `${id}-stage`,
    stageName: `${id}-stage`,
    venueId,
    day: 1,
    startAt: base + startAtOffsetSeconds,
    finishAt: base + finishAtOffsetSeconds,
  };
}

describe("route planner", () => {
  it("groups overlapping performances together", () => {
    const sets = [
      buildSet("a", "v1", 0, 60 * 60),
      buildSet("b", "v2", 30 * 60, 90 * 60),
      buildSet("c", "v3", 200 * 60, 260 * 60),
    ];

    const groups = detectConflictGroups(sets);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.performanceIds).toEqual(["a", "b"]);
  });

  it("orders conflict options by shortest transfer from the previous set", () => {
    const favorites = [
      buildSet("prev", "o-east", -60 * 60, -5 * 60),
      buildSet("optA", "duo", 0, 10 * 60),
      buildSet("optB", "quattro", 30, 11 * 60),
    ];

    const route = planRoute(favorites, 1);

    expect(route.conflictGroups).toHaveLength(1);
    expect(route.conflictGroups[0]?.performances.map((performance) => performance.id)).toEqual([
      "optA",
      "optB",
    ]);
  });

  it("includes negative buffers in the average buffer summary", () => {
    const favorites = [
      buildSet("first", "o-east", 0, 10 * 60),
      buildSet("second", "quattro", 11 * 60, 40 * 60),
    ];

    const route = planRoute(favorites, 1);

    expect(route.impossibleLegs).toBe(1);
    expect(route.averageBuffer).toBeLessThan(0);
  });
});
