"use client";

import { forwardRef, useMemo } from "react";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import type { TimetableSet } from "@/lib/data/timetable";
import { useTranslation } from "@/lib/i18n/client";
import GoogleMapsEmbed from "@/components/google-maps-embed";
import { BufferTimeline } from "@/components/buffer-timeline";

/**
 * Enhanced export sheet with:
 * - Google Maps visualization
 * - Buffer timeline showing performance + walk + buffer time
 * - Clear time breakdown for each leg
 */
export const EnhancedRouteExportSheet = forwardRef<
  HTMLDivElement,
  {
    route: PlannedRoute;
    frameSets: TimetableSet[];
    dayLabel: string;
  }
>(function EnhancedRouteExportSheet({ route, frameSets, dayLabel }, ref) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const totalPerformance = route.legs.reduce(
      (sum, leg) => sum + Math.round((leg.set.finishAt - leg.set.startAt) / 60),
      0
    );

    const totalWalking = route.legs.reduce((sum, leg) => {
      if (leg.nextSet) {
        return sum + leg.walkMinutes;
      }
      return sum;
    }, 0);

    const totalBuffer = route.legs.reduce((sum, leg) => {
      if (leg.nextSet && leg.bufferMinutes > 0 && leg.bufferMinutes !== Infinity) {
        return sum + leg.bufferMinutes;
      }
      return sum;
    }, 0);

    return { totalPerformance, totalWalking, totalBuffer };
  }, [route.legs]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[32px] border border-zinc-800 bg-gradient-to-br from-[#030303] to-[#0a0a0a] p-6 text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    >
      {/* Header */}
      <div className="flex items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            SYNCHRONICITY&apos;26
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {t("plan.title")}
          </div>
          <div className="mt-1 text-sm text-zinc-400">{dayLabel}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t("map.selectedCount", { count: route.totalSets })}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {t("plan.leg.performanceTime")}
              </div>
              <div className="mt-1 text-lg font-bold text-cyan-400">
                {stats.totalPerformance}m
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {t("plan.leg.walk")}
              </div>
              <div className="mt-1 text-lg font-bold text-amber-400">
                {stats.totalWalking}m
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                {t("plan.leg.bufferTime")}
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-400">
                {stats.totalBuffer}m
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">
        <div className="h-[320px] w-full bg-zinc-950">
          <GoogleMapsEmbed
            favorites={route.legs.map((leg) => leg.set)}
            daySets={frameSets}
            routeLegs={route.legs}
            className="h-full"
          />
        </div>
      </div>

      {/* Buffer Timeline Section */}
      <div className="mt-6">
        <div className="mb-3 border-b border-zinc-800 pb-3">
          <div className="text-sm font-semibold text-zinc-100">
            {t("plan.routeDetailsTitle")}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{t("plan.exportHint")}</div>
        </div>
        <BufferTimeline legs={route.legs} />
      </div>

      {/* Footer QR Code Area (for printing) */}
      <div className="mt-6 border-t border-zinc-800 pt-4 text-center">
        <div className="text-xs text-zinc-500">
          {t("meta.title")} • {new Date().toLocaleDateString("en-US")}
        </div>
      </div>
    </div>
  );
});

export default EnhancedRouteExportSheet;
