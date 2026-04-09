"use client";

import { venueMap } from "@/lib/data/venues";
import type { PlannedRoute } from "@/lib/utils/route-planner";
import { formatTime } from "@/lib/utils/route-planner";
import { useTranslation } from "@/lib/i18n/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Navigation } from "lucide-react";

export function RouteLegList({
  route,
  className,
}: {
  route: PlannedRoute;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative ml-3 space-y-6 border-l-2 border-zinc-800 py-2", className)}>
      {route.legs.map((leg) => {
        const venue = venueMap.get(leg.set.venueId || "");
        const nextVenue = leg.nextSet
          ? venueMap.get(leg.nextSet.venueId || "")
          : undefined;

        // Determine node dot color based on status or venue
        const isConflict = leg.status === "impossible";
        const isTight = leg.status === "tight";

        return (
          <div key={leg.set.id} className="relative pl-5 before:absolute before:-left-[9px] before:top-2 before:h-4 before:w-4 before:rounded-full before:border-[3px] before:border-zinc-950 before:bg-zinc-700">
            {/* Timeline Dot override if we have a venue color */}
            {venue && (
              <div 
                className="absolute -left-[9px] top-2 h-4 w-4 rounded-full border-[3px] border-zinc-950 z-10"
                style={{ backgroundColor: venue.color }}
              />
            )}
            
            <div className={cn(
              "rounded-2xl border bg-zinc-950/75 p-3.5 transition-colors",
              isConflict ? "border-rose-500/30 bg-rose-500/[0.04]" : isTight ? "border-amber-500/30" : "border-zinc-800 hover:border-zinc-700"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                      {formatTime(leg.set.startAt)} - {formatTime(leg.set.finishAt)}
                    </div>
                  </div>
                  <div className="mt-1 text-base font-bold text-zinc-50 leading-tight">
                    {leg.set.artistName}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                    <span 
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: venue?.color || "#52525b" }}
                    />
                    {venue?.name ?? leg.set.stageName}
                  </div>
                </div>
              </div>
            </div>

            {/* Transition UI */}
            {leg.nextSet && nextVenue ? (
              <div className="mt-4 mb-2 ml-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{t("plan.leg.walk", { minutes: leg.walkMinutes })}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={cn(
                      "bg-black/20 text-[10px]",
                      isConflict ? "border-rose-500/40 text-rose-300" : isTight ? "border-amber-500/40 text-amber-300" : "border-zinc-800 text-zinc-400"
                    )}>
                      {t("plan.leg.buffer", { minutes: leg.bufferMinutes })}
                    </Badge>
                  </div>
                  {isConflict ? (
                    <div className="text-[11px] font-medium text-rose-400/90 mt-0.5">
                      {t("plan.leg.conflictAdvice")}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
