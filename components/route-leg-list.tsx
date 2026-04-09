"use client";

import { venueMap } from "@/lib/data/venues";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import { formatTime } from "@/lib/utils/route-planner";
import { useTranslation } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/badge";
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
            className="rounded-2xl border border-zinc-800 bg-zinc-950/75 px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {formatTime(leg.set.startAt)} - {formatTime(leg.set.finishAt)}
                </div>
                <div className="mt-0.5 text-base font-semibold text-zinc-50">
                  {leg.set.artistName}
                </div>
                <div className="text-xs text-zinc-400">
                  {venue?.name ?? leg.set.stageName}
                </div>
              </div>
              {venue ? (
                <span
                  className="mt-0.5 inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: venue.color }}
                />
              ) : null}
            </div>

            {leg.nextSet && nextVenue ? (
              <div
                className={cn(
                  "mt-3 border-t pt-3",
                  leg.status === "impossible"
                    ? "border-rose-500/20"
                    : leg.status === "tight"
                      ? "border-amber-500/20"
                      : "border-cyan-500/20",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                  <Navigation className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="font-medium">{venue?.name}</span>
                  <ArrowRight className="h-3 w-3 text-zinc-600" />
                  <span className="font-medium">{nextVenue.name}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-zinc-800 bg-black/20 text-zinc-300"
                  >
                    {t("plan.leg.gap", { minutes: leg.gapMinutes })}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-zinc-800 bg-black/20 text-zinc-300"
                  >
                    {t("plan.leg.walk", { minutes: leg.walkMinutes })}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-zinc-800 bg-black/20 text-zinc-300"
                  >
                    {t("plan.leg.buffer", { minutes: leg.bufferMinutes })}
                  </Badge>

                  <span className="text-[10px] text-zinc-500">
                    {leg.travelSource === "route-api"
                      ? t("plan.leg.apiSource")
                      : leg.travelSource === "same-venue"
                        ? t("plan.leg.sameVenue")
                        : t("plan.leg.matrixSource")}
                  </span>
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
