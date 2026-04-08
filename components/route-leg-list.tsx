"use client";

import { venueMap } from "@/lib/data/venues";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import { formatTime } from "@/lib/utils/route-planner";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { Navigation, ArrowRight } from "lucide-react";

export function RouteLegList({
  route,
  className,
}: {
  route: PlannedRoute;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-3", className)}>
      {route.legs.map((leg) => {
        const venue = venueMap.get(leg.set.venueId || "");
        const nextVenue = leg.nextSet
          ? venueMap.get(leg.nextSet.venueId || "")
          : undefined;

        return (
          <div
            key={leg.set.id}
            className="rounded-[24px] border border-zinc-800 bg-zinc-950/75 px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                  {formatTime(leg.set.startAt)} - {formatTime(leg.set.finishAt)}
                </div>
                <div className="mt-1 text-lg font-semibold text-zinc-50">
                  {leg.set.artistName}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  {venue?.name ?? leg.set.stageName}
                </div>
              </div>
              {venue ? (
                <span
                  className="mt-1 inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: venue.color }}
                />
              ) : null}
            </div>

            {leg.nextSet && nextVenue ? (
              <div
                className={cn(
                  "mt-4 rounded-2xl border px-3 py-3",
                  leg.status === "impossible"
                    ? "border-rose-500/20 bg-rose-500/[0.05]"
                    : leg.status === "tight"
                      ? "border-amber-500/20 bg-amber-500/[0.05]"
                      : "border-cyan-500/20 bg-cyan-500/[0.05]",
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <Navigation className="h-4 w-4" />
                  <span>{venue?.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{nextVenue.name}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-zinc-800 bg-black/20 px-2.5 py-1 text-zinc-300">
                    {t("plan.leg.gap", { minutes: leg.gapMinutes })}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-black/20 px-2.5 py-1 text-zinc-300">
                    {t("plan.leg.walk", { minutes: leg.walkMinutes })}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-black/20 px-2.5 py-1 text-zinc-300">
                    {t("plan.leg.buffer", { minutes: leg.bufferMinutes })}
                  </span>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {leg.travelSource === "route-api"
                    ? t("plan.leg.apiSource")
                    : leg.travelSource === "same-venue"
                      ? t("plan.leg.sameVenue")
                      : t("plan.leg.matrixSource")}
                </div>
                {leg.status === "impossible" ? (
                  <div className="mt-2 text-xs font-medium text-rose-300">
                    {t("plan.leg.conflictAdvice")}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
