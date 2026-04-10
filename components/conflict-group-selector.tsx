"use client";

import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/client";
import { venueMap } from "@/lib/data/venues";
import {
  formatTime,
  type ConflictGroup,
  type ConflictTransferPreview,
} from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { Navigation, Clock, MapPin, AlertOctagon, AlertTriangle, ArrowRight } from "lucide-react";

interface ConflictGroupSelectorProps {
  groups: ConflictGroup[];
  onToggle: (groupId: string, performanceId: string) => void;
  onSelectAll: (groupId: string, performanceIds: string[]) => void;
  onClearAll: (groupId: string) => void;
}

export const ConflictGroupSelector = memo(function ConflictGroupSelector({
  groups,
  onToggle,
  onSelectAll,
  onClearAll,
}: ConflictGroupSelectorProps) {
  const { t } = useTranslation();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          {t("plan.conflict.groupTitle")}
        </div>
        <Badge className="border-zinc-700 bg-zinc-900/60 text-zinc-300">
          {t("plan.conflict.count", { count: groups.length })}
        </Badge>
      </div>

      <div className="relative mt-4">
        {/* Timeline spine */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-amber-500/30" />

        <div className="space-y-6">
          {groups.map((group) => (
            <ConflictNode
              key={group.id}
              group={group}
              onToggle={onToggle}
              onSelectAll={onSelectAll}
              onClearAll={onClearAll}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

function ConflictNode({
  group,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  group: ConflictGroup;
  onToggle: (groupId: string, performanceId: string) => void;
  onSelectAll: (groupId: string, performanceIds: string[]) => void;
  onClearAll: (groupId: string) => void;
}) {
  const { t } = useTranslation();
  const optionPreviewMap = useMemo(
    () => new Map(group.optionPreviews.map((preview) => [preview.performanceId, preview])),
    [group.optionPreviews],
  );

  const allSelected =
    group.performances.length > 0 &&
    group.performances.every((performance) =>
      group.selectedPerformanceIds.includes(performance.id),
    );

  const timeRange = useMemo(() => {
    const starts = group.performances.map((p) => p.startAt);
    const finishes = group.performances.map((p) => p.finishAt);
    return {
      startAt: Math.min(...starts),
      finishAt: Math.max(...finishes),
    };
  }, [group.performances]);

  const selectedCount = group.selectedPerformanceIds?.length ?? 0;
  const isHardConflict = selectedCount > 1;

  return (
    <div className="relative mb-6 ml-3 rounded-2xl border border-rose-900/30 bg-rose-950/10 p-4 pt-5">
      <div className="absolute -left-[5px] top-4 h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-rose-200">
            {t("plan.conflict.title")}
          </h3>
          <p className="mt-1 text-xs text-rose-300/80">
            {t("plan.conflict.description")}
          </p>
          {isHardConflict && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-300">
              <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="text-xs font-semibold leading-relaxed">
                你同时保留了多个时间产生冲突的演出！你可能需要舍弃其中部分来保证合理规划。
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectAll(group.id, group.performances.map((p) => p.id))}
            disabled={allSelected}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("plan.conflict.selectAll")}
          </button>
          <button
            type="button"
            onClick={() => onClearAll(group.id)}
            disabled={group.selectedPerformanceIds.length === 0}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("plan.conflict.clearAll")}
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {group.performances.map((performance) => {
          const isSelected = group.selectedPerformanceIds.includes(performance.id);
          const venue = performance.venueId ? venueMap.get(performance.venueId) : undefined;
          const preview = optionPreviewMap.get(performance.id);

          return (
            <button
              key={performance.id}
              type="button"
              onClick={() => onToggle(group.id, performance.id)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-all",
                isSelected
                  ? "border-amber-400/40 bg-amber-500/[0.08]"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
              )}
            >
              {/* Selection indicator strip */}
              <div
                className={cn(
                  "absolute left-0 top-2 bottom-2 w-1 rounded-r transition-colors",
                  isSelected ? "bg-amber-400" : "bg-transparent",
                )}
              />

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-100">
                    {performance.artistName}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(performance.startAt)} - {formatTime(performance.finishAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {venue?.name ?? performance.stageName}
                    </span>
                  </div>
                </div>
                {isSelected ? (
                  <Badge className="shrink-0 border-amber-400/30 bg-amber-400/10 text-amber-200">
                    {t("plan.conflict.selectedBadge")}
                  </Badge>
                ) : null}
              </div>

              {/* Transfer preview mini row */}
              {preview ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-800/60 pt-2">
                  <TransferBadge preview={preview.before} label={t("plan.conflict.beforeLabel")} />
                  <TransferBadge preview={preview.after} label={t("plan.conflict.afterLabel")} />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TransferBadge({
  preview,
  label,
}: {
  preview: ConflictTransferPreview | undefined;
  label: string;
}) {

  if (!preview || preview.kind === "none") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-500">
        {label}: —
      </span>
    );
  }

  if (preview.kind === "depends-on-adjacent") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400">
        {label}: <Navigation className="h-3 w-3" /> …
      </span>
    );
  }

  const tone =
    preview.status === "impossible"
      ? "text-rose-300"
      : preview.status === "tight"
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 text-[10px]", tone)}>
      {label}:
      <Navigation className="h-3 w-3" />
      {preview.walkMinutes ?? 0}m
      <ArrowRight className="h-3 w-3 text-zinc-600" />
      {preview.bufferMinutes ?? 0}m
    </span>
  );
}
