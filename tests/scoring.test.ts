import { describe, it, expect } from "vitest";
import type { TFunction } from "i18next";
import { calculateScore } from "../lib/utils/scoring";
import type { PlannedRoute } from "../lib/utils/route-planner";

const t = ((key: string) => key) as unknown as TFunction;

function buildRoute(overrides: Partial<PlannedRoute>): PlannedRoute {
  return {
    day: 1,
    legs: [],
    totalSets: 0,
    impossibleLegs: 0,
    averageBuffer: 0,
    tightLegs: 0,
    justRightLegs: 0,
    comfortableLegs: 0,
    conflictGroups: [],
    branches: [],
    focusedBranchId: "",
    branchOverflow: false,
    ...overrides,
  };
}

describe("scoring", () => {
  it("returns shadowClone when impossibleLegs > 0", () => {
    const route = buildRoute({ totalSets: 3, impossibleLegs: 1, averageBuffer: 5 });
    const result = calculateScore(route, t);
    expect(result.badge).toBe("score.shadowClone");
    expect(result.impossibleJumps).toBe(1);
  });

  it("returns relaxed when averageBuffer >= 15 and no impossible", () => {
    const route = buildRoute({ totalSets: 3, impossibleLegs: 0, averageBuffer: 20 });
    const result = calculateScore(route, t);
    expect(result.badge).toBe("score.relaxed");
  });
});
