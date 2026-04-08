"use client";

import { forwardRef, useMemo } from "react";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import type { TimetableSet } from "@/lib/data/timetable";
import { useTranslation } from "@/lib/i18n/client";
import VenueMap from "@/components/venue-map";
import { TimetableBoard } from "@/components/timetable-board";

export const RouteExportSheet = forwardRef<
  HTMLDivElement,
  {
    route: PlannedRoute;
    frameSets: TimetableSet[];
    dayLabel: string;
  }
>(function RouteExportSheet({ route, frameSets, dayLabel }, ref) {
  const { t } = useTranslation();
  const routeOrder = useMemo(
    () =>
      new Map(
        route.legs.map((leg, index) => [leg.set.id, index + 1]),
      ),
    [route.legs],
  );
  const selectedIds = useMemo(
    () => new Set(route.legs.map((leg) => leg.set.id)),
    [route.legs],
  );

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[32px] border border-zinc-800 bg-[#030303] p-4 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-end justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            SYNCHRONICITY&apos;26
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {t("plan.timelineTitle")}
          </div>
          <div className="mt-1 text-sm text-zinc-400">{dayLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {t("map.selectedCount", { count: route.totalSets })}
          </div>
          <div className="mt-1 text-sm text-zinc-300">{t("plan.exportHint")}</div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[28px] border border-zinc-800">
        <div className="h-[280px] w-full bg-zinc-950">
          <VenueMap
            favorites={route.legs.map((leg) => leg.set)}
            daySets={frameSets}
            routeLegs={route.legs}
          />
        </div>
      </div>

      <div className="mt-4">
        <TimetableBoard
          sets={route.legs.map((leg) => leg.set)}
          frameSets={frameSets}
          selectedIds={selectedIds}
          routeOrder={routeOrder}
          onlyActiveVenues
        />
      </div>
    </div>
  );
});
