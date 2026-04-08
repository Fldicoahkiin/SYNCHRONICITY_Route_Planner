import { describe, it, expect } from "vitest";
import { calculateScore } from "../lib/utils/scoring";

const t = (k: string) => k;

describe("scoring", () => {
  it("returns shadowClone when impossibleLegs > 0", () => {
    const route: any = { totalSets: 3, impossibleLegs: 1, averageBuffer: 5 };
    const result = calculateScore(route, t as any);
    expect(result.badge).toBe("score.shadowClone");
    expect(result.impossibleJumps).toBe(1);
  });

  it("returns relaxed when averageBuffer >= 15 and no impossible", () => {
    const route: any = { totalSets: 3, impossibleLegs: 0, averageBuffer: 20 };
    const result = calculateScore(route, t as any);
    expect(result.badge).toBe("score.relaxed");
  });
});
