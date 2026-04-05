import type { TFunction } from "i18next";
import type { PlannedRoute } from "./route-planner";

export type ScoreBadge =
  | "relaxed"
  | "master"
  | "shadowClone";

export interface ScoreResult {
  badge: string;
  color: "green" | "yellow" | "red";
  attendableSets: number;
  averageBufferMinutes: number;
  impossibleJumps: number;
  advice: string;
}

export function calculateScore(
  route: PlannedRoute,
  t: TFunction,
): ScoreResult {
  const { totalSets, impossibleLegs, averageBuffer } = route;

  let attendableSets = totalSets;
  if (impossibleLegs > 0) {
    attendableSets = Math.max(1, totalSets - impossibleLegs);
  }

  if (impossibleLegs > 0) {
    return {
      badge: t("score.shadowClone"),
      color: "red",
      attendableSets,
      averageBufferMinutes: Math.round(averageBuffer),
      impossibleJumps: impossibleLegs,
      advice: t("score.adviceShadowClone", {
        count: impossibleLegs,
      }),
    };
  }

  if (averageBuffer >= 15) {
    return {
      badge: t("score.relaxed"),
      color: "green",
      attendableSets,
      averageBufferMinutes: Math.round(averageBuffer),
      impossibleJumps: 0,
      advice: t("score.adviceRelaxed"),
    };
  }

  return {
    badge: t("score.master"),
    color: "yellow",
    attendableSets,
    averageBufferMinutes: Math.round(averageBuffer),
    impossibleJumps: 0,
    advice: t("score.adviceMaster"),
  };
}
