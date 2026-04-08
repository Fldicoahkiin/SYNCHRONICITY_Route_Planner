import { describe, it, expect } from "vitest";
import { detectConflictGroups } from "../lib/utils/route-planner";

describe("route-planner detectConflictGroups", () => {
  it("groups overlapping performances together", () => {
    const base = 1680000000;
    const sets = [
      { id: "a", day: 1, startAt: base + 0, finishAt: base + 60 * 60, venueId: "v1", artistName: "A", stageName: "S1" },
      { id: "b", day: 1, startAt: base + 30 * 60, finishAt: base + 90 * 60, venueId: "v2", artistName: "B", stageName: "S2" },
      { id: "c", day: 1, startAt: base + 200 * 60, finishAt: base + 260 * 60, venueId: "v3", artistName: "C", stageName: "S3" },
    ];

    const groups = detectConflictGroups(sets as any);
    expect(groups.length).toBe(1);
    const group = groups[0];
    expect(group.performanceIds.sort()).toEqual(["a", "b"].sort());
  });
});
