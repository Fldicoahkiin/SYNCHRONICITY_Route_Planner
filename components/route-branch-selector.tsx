"use client";

import { Button, Chip } from "@heroui/react";
import { useTranslation } from "@/lib/i18n/client";
import type { ConflictGroup, PlannedRouteBranch } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { Check, GitBranch } from "lucide-react";

interface RouteBranchSelectorProps {
  branches: PlannedRouteBranch[];
  conflictGroups: ConflictGroup[];
  focusedBranchId: string;
  branchOverflow: boolean;
  onFocusBranch: (branchId: string) => void;
  className?: string;
}

export function RouteBranchSelector({
  branches,
  conflictGroups,
  focusedBranchId,
  branchOverflow,
  onFocusBranch,
  className,
}: RouteBranchSelectorProps) {
  const { t } = useTranslation();

  if (branches.length === 0) {
    return null;
  }

  const performanceNameById = new Map(
    conflictGroups.flatMap((group) =>
      group.performances.map((performance) => [performance.id, performance.artistName] as const),
    ),
  );

  return (
    <section
      className={cn(
        "rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <GitBranch className="h-4 w-4 text-cyan-400" />
            {t("plan.branch.title")}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {t("plan.branch.description", { count: branches.length })}
          </p>
        </div>
        <Chip
          variant="secondary"
          className="border-zinc-700 bg-zinc-900/60 text-zinc-300"
        >
          {t("plan.branch.count", { count: branches.length })}
        </Chip>
      </div>

      {branchOverflow ? (
        <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t("plan.branch.overflow")}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {branches.map((branch, index) => {
          const isFocused = branch.id === focusedBranchId;
          const choiceNames = conflictGroups
            .map((group) => {
              const performanceId = branch.conflictSelections[group.id];
              if (!performanceId) {
                return t("plan.branch.skipChoice");
              }
              return performanceNameById.get(performanceId) ?? performanceId;
            })
            .join(" · ");

          return (
            <div
              key={branch.id}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                isFocused
                  ? "border-cyan-500/40 bg-cyan-500/[0.08]"
                  : "border-zinc-800 bg-zinc-900/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {t("plan.branch.label", { index: index + 1 })}
                    </h3>
                    {isFocused ? (
                      <Chip
                        variant="secondary"
                        className="border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                      >
                        {t("plan.branch.current")}
                      </Chip>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{choiceNames}</p>
                </div>
                <Button
                  size="sm"
                  variant={isFocused ? "primary" : "outline"}
                  className={cn(
                    "min-w-[88px] text-xs font-semibold",
                    isFocused
                      ? "bg-cyan-400 text-black"
                      : "border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800",
                  )}
                  onPress={() => onFocusBranch(branch.id)}
                >
                  {isFocused ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {t("plan.branch.current")}
                    </span>
                  ) : (
                    t("plan.branch.setCurrent")
                  )}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Chip variant="secondary" className="border-zinc-700 bg-zinc-900/60 text-zinc-300">
                  {t("plan.branch.totalSets", { count: branch.totalSets })}
                </Chip>
                <Chip
                  variant="secondary"
                  className={cn(
                    branch.impossibleLegs > 0
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-300",
                  )}
                >
                  {t("plan.branch.impossible", { count: branch.impossibleLegs })}
                </Chip>
                <Chip
                  variant="secondary"
                  className={cn(
                    branch.tightLegs > 0
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                      : "border-zinc-700 bg-zinc-900/60 text-zinc-300",
                  )}
                >
                  {t("plan.branch.tight", { count: branch.tightLegs })}
                </Chip>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
