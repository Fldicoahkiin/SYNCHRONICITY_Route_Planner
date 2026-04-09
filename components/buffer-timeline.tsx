"use client";

import { useMemo } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { verifiedVenueMap } from "@/lib/data/venues-verified";
import { formatTime, type RouteLeg } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { Navigation, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface BufferTimelineProps {
  legs: RouteLeg[];
  className?: string;
}

/**
 * Timeline showing performance time + buffer time + walking time
 * Provides clear visualization of schedule feasibility
 */
export function BufferTimeline({ legs, className }: BufferTimelineProps) {
  const { t } = useTranslation();

  const timelineItems = useMemo(() => {
    return legs.map((leg, idx) => {
      const venue = verifiedVenueMap.get(leg.set.venueId || "");
      const nextVenue = leg.nextSet
        ? verifiedVenueMap.get(leg.nextSet.venueId || "")
        : undefined;

      const duration = Math.round((leg.set.finishAt - leg.set.startAt) / 60);
      const isLast = idx === legs.length - 1;

      return {
        leg,
        venue,
        nextVenue,
        duration,
        isLast,
        isSelected: true,
      };
    });
  }, [legs]);

  const stats = useMemo(() => {
    const totalPerformance = legs.reduce(
      (sum, leg) => sum + Math.round((leg.set.finishAt - leg.set.startAt) / 60),
      0
    );

    const totalWalking = legs.reduce((sum, leg) => {
      if (leg.nextSet) {
        return sum + leg.walkMinutes;
      }
      return sum;
    }, 0);

    const totalBuffer = legs.reduce((sum, leg) => {
      if (leg.nextSet && leg.bufferMinutes > 0 && leg.bufferMinutes !== Infinity) {
        return sum + leg.bufferMinutes;
      }
      return sum;
    }, 0);

    const impossible = legs.filter((leg) => leg.status === "impossible").length;
    const tight = legs.filter((leg) => leg.status === "tight").length;

    return { totalPerformance, totalWalking, totalBuffer, impossible, tight };
  }, [legs]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            {t("plan.leg.performanceTime")}
          </div>
          <div className="mt-1 text-lg font-bold text-cyan-400">
            {stats.totalPerformance}m
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            {t("plan.leg.walkingTime")}
          </div>
          <div className="mt-1 text-lg font-bold text-amber-400">
            {stats.totalWalking}m
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            {t("plan.leg.bufferTime")}
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-400">
            {stats.totalBuffer}m
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            {t("plan.scoreLabel")}
          </div>
          <div
            className={cn(
              "mt-1 text-lg font-bold",
              stats.impossible > 0
                ? "text-rose-400"
                : stats.tight > 0
                ? "text-amber-400"
                : "text-emerald-400"
            )}
          >
            {stats.impossible > 0
              ? `${stats.impossible} ${t("plan.leg.statusImpossible")}`
              : stats.tight > 0
              ? `${stats.tight} ${t("plan.leg.statusTight")}`
              : t("plan.leg.statusComfortable")}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {timelineItems.map((item) => (
          <div key={item.leg.set.id} className="space-y-2">
            {/* Performance Block */}
            <div className="rounded-lg border border-cyan-800/50 bg-cyan-900/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                      {t("plan.leg.performance")}
                    </span>
                  </div>
                  <div className="mt-2 ml-6">
                    <div className="text-sm font-bold text-zinc-100">
                      {item.leg.set.artistName}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {item.leg.set.stageName}
                    </div>
                    {item.venue && (
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.venue.color }}
                        />
                        {item.venue.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">
                    {item.duration}m
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {formatTime(item.leg.set.startAt)} -{" "}
                    {formatTime(item.leg.set.finishAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Travel & Buffer Block (if not last) */}
            {!item.isLast && item.leg.nextSet && (
              <div
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  item.leg.status === "impossible"
                    ? "border-rose-800/50 bg-rose-900/20"
                    : item.leg.status === "tight"
                    ? "border-amber-800/50 bg-amber-900/20"
                    : item.leg.status === "just-right"
                    ? "border-cyan-800/50 bg-cyan-900/20"
                    : "border-emerald-800/50 bg-emerald-900/20"
                )}
              >
                <div className="space-y-2">
                  {/* Walking Time */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Navigation className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      <span className="font-semibold">{t("plan.leg.walk")}</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-400">
                        {item.leg.walkMinutes}m
                      </span>
                      <span className="text-zinc-500 ml-1">
                        → {item.nextVenue?.name}
                      </span>
                    </div>
                  </div>

                  {/* Gap Time */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="text-zinc-400">
                      {t("plan.leg.gap")}
                    </div>
                    <div className="font-semibold text-zinc-300">
                      {item.leg.gapMinutes}m
                    </div>
                  </div>

                  {/* Buffer Time */}
                  <div className="flex items-center justify-between gap-2 text-xs border-t border-white/10 pt-2">
                    <div className="flex items-center gap-1.5">
                      {item.leg.status === "impossible" ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                          <span className="font-semibold text-rose-300">
                            {t("plan.leg.bufferTime")}
                          </span>
                        </>
                      ) : item.leg.status === "tight" ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                          <span className="font-semibold text-amber-300">
                            {t("plan.leg.bufferTime")}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-semibold text-emerald-300">
                            {t("plan.leg.bufferTime")}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-bold",
                          item.leg.status === "impossible"
                            ? "text-rose-400"
                            : item.leg.status === "tight"
                            ? "text-amber-400"
                            : item.leg.status === "just-right"
                            ? "text-cyan-400"
                            : "text-emerald-400"
                        )}
                      >
                        {item.leg.bufferMinutes === Infinity
                          ? "∞"
                          : `${item.leg.bufferMinutes}m`}
                      </span>
                      <span className="text-zinc-500 text-[10px]">
                        {item.leg.status === "impossible"
                          ? t("plan.leg.statusImpossible")
                          : item.leg.status === "tight"
                          ? t("plan.leg.statusTight")
                          : item.leg.status === "just-right"
                          ? t("plan.leg.statusJustRight")
                          : t("plan.leg.statusComfortable")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
          {t("plan.legend")}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-cyan-500" />
            <span className="text-zinc-400">{t("plan.leg.performance")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-zinc-400">{t("plan.leg.walk")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">{t("plan.leg.bufferTime")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-zinc-400">{t("score.shadowClone")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
