"use client";

import { Button, Checkbox, Chip } from "@heroui/react";
import { useTranslation } from "@/lib/i18n/client";
import { venueMap } from "@/lib/data/venues";
import {
  formatTime,
  type ConflictGroup,
  type ConflictTransferPreview,
} from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Clock, MapPin } from "lucide-react";

interface ConflictGroupSelectorProps {
  group: ConflictGroup;
  onToggle: (groupId: string, performanceId: string) => void;
  onSelectAll: (groupId: string, performanceIds: string[]) => void;
  onClearAll: (groupId: string) => void;
}

export function ConflictGroupSelector({
  group,
  onToggle,
  onSelectAll,
  onClearAll,
}: ConflictGroupSelectorProps) {
  const { t } = useTranslation();
  const optionPreviewMap = new Map(
    group.optionPreviews.map((preview) => [preview.performanceId, preview]),
  );

  const allSelected =
    group.performances.length > 0 &&
    group.performances.every((performance) =>
      group.selectedPerformanceIds.includes(performance.id),
    );

  return (
    <section className="rounded-[28px] border border-amber-500/25 bg-amber-500/[0.08] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            {t("plan.conflict.groupTitle")}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
            {t("plan.conflict.warningDetail")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chip variant="secondary" className="border-amber-400/30 bg-black/10 text-amber-100">
            {t("plan.conflict.selected", { count: group.selectedPerformanceIds.length })}
          </Chip>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400/30 bg-black/10 text-amber-100 hover:bg-black/20"
            onPress={() => onSelectAll(group.id, group.performances.map((performance) => performance.id))}
            isDisabled={allSelected}
          >
            {t("plan.conflict.selectAll")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400/30 bg-black/10 text-amber-100 hover:bg-black/20"
            onPress={() => onClearAll(group.id)}
            isDisabled={group.selectedPerformanceIds.length === 0}
          >
            {t("plan.conflict.clearAll")}
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {group.performances.map((performance) => {
          const isSelected = group.selectedPerformanceIds.includes(performance.id);
          const venue = performance.venueId ? venueMap.get(performance.venueId) : undefined;
          const preview = optionPreviewMap.get(performance.id);

          return (
            <div
              key={performance.id}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                isSelected
                  ? "border-amber-400/35 bg-black/15"
                  : "border-amber-500/15 bg-black/5",
              )}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  isSelected={isSelected}
                  onChange={() => onToggle(group.id, performance.id)}
                  className="mt-0.5"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-50">
                        {performance.artistName}
                      </span>
                      {isSelected ? (
                        <Chip
                          variant="secondary"
                          className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                        >
                          {t("plan.conflict.selectedBadge")}
                        </Chip>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(performance.startAt)} - {formatTime(performance.finishAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {venue?.name ?? performance.stageName}
                      </span>
                    </div>
                  </div>
                </Checkbox>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <PreviewCard
                  label={t("plan.conflict.beforeLabel")}
                  preview={preview?.before}
                />
                <PreviewCard
                  label={t("plan.conflict.afterLabel")}
                  preview={preview?.after}
                  isAfter
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-black/10 px-3 py-2 text-xs text-amber-100/85">
        {t("plan.conflict.warning")}
      </div>
    </section>
  );
}

function PreviewCard({
  label,
  preview,
  isAfter = false,
}: {
  label: string;
  preview: ConflictTransferPreview | undefined;
  isAfter?: boolean;
}) {
  const { t } = useTranslation();

  if (!preview || preview.kind === "none") {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-xs text-zinc-500">
        <div className="font-medium text-zinc-300">{label}</div>
        <div className="mt-1">{t("plan.conflict.noAnchor")}</div>
      </div>
    );
  }

  if (preview.kind === "depends-on-adjacent") {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-xs text-zinc-400">
        <div className="font-medium text-zinc-300">{label}</div>
        <div className="mt-1">{t("plan.conflict.dependsOnAdjacent")}</div>
      </div>
    );
  }

  const statusClass =
    preview.status === "impossible"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
      : preview.status === "tight"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-100";

  return (
    <div className={cn("rounded-2xl border px-3 py-3 text-xs", statusClass)}>
      <div className="font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-current/80">
        <span>{preview.referencePerformance?.artistName}</span>
        <ArrowRight className="h-3 w-3" />
        <span>{isAfter ? t("plan.conflict.nextStop") : t("plan.conflict.thisStop")}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
        <Chip variant="secondary" className="border-white/10 bg-black/10 text-current">
          {t("plan.leg.walk", { minutes: preview.walkMinutes ?? 0 })}
        </Chip>
        <Chip variant="secondary" className="border-white/10 bg-black/10 text-current">
          {t("plan.leg.buffer", { minutes: preview.bufferMinutes ?? 0 })}
        </Chip>
      </div>
    </div>
  );
}
