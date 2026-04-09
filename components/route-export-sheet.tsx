"use client";

import { forwardRef, useMemo } from "react";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import type { TimetableSet } from "@/lib/data/timetable";
import { useTranslation } from "@/lib/i18n/client";
import GoogleMapsEmbed from "@/components/google-maps-embed";
import { BufferTimeline } from "@/components/buffer-timeline";
import { AlertTriangle } from "lucide-react";

export const RouteExportSheet = forwardRef<
  HTMLDivElement,
  {
    route: PlannedRoute;
    frameSets: TimetableSet[];
    dayLabel: string;
  }
>(function RouteExportSheet({ route, frameSets, dayLabel }, ref) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const totalPerformance = route.legs.reduce(
      (sum, leg) => sum + Math.round((leg.set.finishAt - leg.set.startAt) / 60),
      0,
    );

    const totalWalking = route.legs.reduce((sum, leg) => {
      if (!leg.nextSet) {
        return sum;
      }
      return sum + leg.walkMinutes;
    }, 0);

    const totalBuffer = route.legs.reduce((sum, leg) => {
      if (!leg.nextSet || leg.bufferMinutes <= 0 || !Number.isFinite(leg.bufferMinutes)) {
        return sum;
      }
      return sum + leg.bufferMinutes;
    }, 0);

    return {
      totalPerformance,
      totalWalking,
      totalBuffer,
    };
  }, [route.legs]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[32px] border border-zinc-800 bg-black p-5 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
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

      {(route.impossibleLegs > 0 || route.tightLegs > 0) && (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-300" />
            <div>
              <div className="font-semibold">{t("plan.riskTitle")}</div>
              <div className="mt-1 text-xs text-rose-100/80">
                {t("plan.riskDetail", {
                  impossible: route.impossibleLegs,
                  tight: route.tightLegs,
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {t("plan.leg.performanceTime")}
          </div>
          <div className="mt-1 text-lg font-bold text-cyan-300">{stats.totalPerformance}m</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {t("plan.leg.walkingTime")}
          </div>
          <div className="mt-1 text-lg font-bold text-amber-300">{stats.totalWalking}m</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {t("plan.leg.bufferTime")}
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-300">{stats.totalBuffer}m</div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[28px] border border-zinc-800">
        <div className="h-[320px] w-full bg-zinc-950">
          <GoogleMapsEmbed
            favorites={route.legs.map((leg) => leg.set)}
            daySets={frameSets}
            routeLegs={route.legs}
            className="h-full"
          />
        </div>
      </div>

      <div className="mt-4">
        <BufferTimeline legs={route.legs} />
      </div>
    </div>
  );
});
