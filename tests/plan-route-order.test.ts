import { describe, it, expect } from "vitest";
import { planRoute } from "../lib/utils/route-planner";

describe("planRoute conflict ordering", () => {
  it("orders conflict options by shortest transfer from previous set", () => {
    const base = 1680000000;
    const sets = [
      // previous set at o-east
      { id: "prev", day: 1, startAt: base - 3600, finishAt: base - 300, venueId: "o-east", artistName: "Prev", stageName: "PrevStage" },
      // two overlapping performances (conflict) with different walk minutes from prev
      { id: "optA", day: 1, startAt: base, finishAt: base + 600, venueId: "duo", artistName: "A", stageName: "A" },
      { id: "optB", day: 1, startAt: base + 30, finishAt: base + 650, venueId: "quattro", artistName: "B", stageName: "B" },
    ];

    const route = planRoute(sets as any, 1);
    expect(route.conflictGroups && route.conflictGroups.length).toBeGreaterThan(0);
    const group = route.conflictGroups![0];
    // duo from o-east is 1 min, quattro is 12 min -> duo should come first
    expect(group.performances[0].id).toBe("optA");
  });
});
