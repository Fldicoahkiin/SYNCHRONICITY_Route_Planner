"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/client";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import { ConflictGroupSelector } from "@/components/conflict-group-selector";
import { RouteLegList } from "@/components/route-leg-list";
import { cn } from "@/lib/utils";
import { AlertTriangle, LoaderCircle } from "lucide-react";

interface RoutePlannerPanelProps {
  route: PlannedRoute;
  onToggleOption: (groupId: string, performanceId: string) => void;
  onSelectAllInGroup: (groupId: string, performanceIds: string[]) => void;
  onClearGroup: (groupId: string) => void;
  isLoadingDirections?: boolean;
  className?: string;
}

export const RoutePlannerPanel = memo(function RoutePlannerPanel({
  route,
  onToggleOption,
  onSelectAllInGroup,
  onClearGroup,
  isLoadingDirections = false,
  className,
}: RoutePlannerPanelProps) {
  const { t } = useTranslation();
  const hasRisk = route.impossibleLegs > 0 || route.tightLegs > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {route.conflictGroups.length > 0 ? (
        <ConflictGroupSelector
          groups={route.conflictGroups}
          onToggle={onToggleOption}
          onSelectAll={onSelectAllInGroup}
          onClearAll={onClearGroup}
        />
      ) : null}

      {isLoadingDirections ? (
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
          <LoaderCircle className="h-4 w-4 animate-spin text-cyan-400" />
          {t("plan.routeLoading")}
        </div>
      ) : null}

      {hasRisk ? (
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/[0.08] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
              <div>
                <div className="text-sm font-semibold text-rose-100">
                  {t("plan.riskTitle")}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-rose-200/80">
                  {t("plan.riskDetail", {
                    impossible: route.impossibleLegs,
                    tight: route.tightLegs,
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-rose-400/30 bg-black/10 text-rose-100">
                {t("plan.branch.impossible", { count: route.impossibleLegs })}
              </Badge>
              <Badge className="border-amber-400/30 bg-black/10 text-amber-100">
                {t("plan.branch.tight", { count: route.tightLegs })}
              </Badge>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">
          {t("plan.routeDetailsTitle")}
        </h3>
        <RouteLegList route={route} />
      </div>
    </div>
  );
});
