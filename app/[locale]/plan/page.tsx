"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import useLocalStorageState from "use-local-storage-state";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import { useDay } from "@/lib/hooks/use-day";
import { usePlannedRoute } from "@/lib/hooks/use-planned-route";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { timetable } from "@/lib/data/timetable";
import { calculateScore } from "@/lib/utils/scoring";
import { formatTime } from "@/lib/utils/route-planner";
import { buildAppleMapsRouteUrl, buildGoogleMapsRouteUrl } from "@/lib/utils/map-urls";
import { getRouteExportStops } from "@/lib/utils/routing";
import { RoutePlannerPanel } from "@/components/route-planner-panel";
import { RouteExportSheet } from "@/components/route-export-sheet";
import type { Locale } from "@/lib/i18n/settings";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share2,
} from "lucide-react";

export default function PlanPage() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [day, setDay] = useDay();
  const [copied, setCopied] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const exportSheetRef = useRef<HTMLDivElement>(null);
  const [favorites] = useLocalStorageState<Record<string, boolean>>(
    "synchronicity-favorites",
    { defaultValue: {} },
  );

  const favoriteSets = useMemo(
    () => timetable.filter((set) => favorites[set.id]),
    [favorites],
  );

  const dayNum = day === "1" ? 1 : 2;
  const daySets = useMemo(
    () => timetable.filter((set) => set.day === dayNum),
    [dayNum],
  );
  const {
    route,
    toggleOption,
    selectAllInGroup,
    clearGroup,
    setFocusedBranch,
    isLoadingDirections,
    hasRouteApiError,
  } = usePlannedRoute(favoriteSets, dayNum);
  const score = useMemo(() => calculateScore(route, t), [route, t]);
  const dayLabel = day === "1" ? t("plan.tabs.day1") : t("plan.tabs.day2");
  const exportStops = useMemo(() => getRouteExportStops(route.legs), [route.legs]);
  const googleRouteUrl = useMemo(
    () => buildGoogleMapsRouteUrl(exportStops),
    [exportStops],
  );
  const appleRouteUrl = useMemo(
    () => buildAppleMapsRouteUrl(exportStops),
    [exportStops],
  );
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const canOpenRoute = exportStops.length > 1;
  const locale = (pathname.split("/")[1] as Locale) || "ja";

  const planText = useMemo(() => {
    if (route.totalSets === 0) {
      return "";
    }

    const lines: string[] = [`SYNCHRONICITY'26 - ${dayLabel}`, ""];

    route.legs.forEach((leg) => {
      lines.push(
        `${formatTime(leg.set.startAt)}-${formatTime(leg.set.finishAt)} ${leg.set.artistName} @ ${leg.set.stageName}`,
      );

      if (leg.nextSet) {
        lines.push(
          `  ↳ ${t("plan.leg.walk", { minutes: leg.walkMinutes })} / ${t("plan.leg.buffer", {
            minutes: leg.bufferMinutes,
          })}`,
        );
      }
    });

    lines.push("");
    lines.push(`${t("plan.scoreLabel")}: ${score.badge}`);

    if (route.impossibleLegs > 0 || route.tightLegs > 0) {
      lines.push(t("plan.riskDetail", {
        impossible: route.impossibleLegs,
        tight: route.tightLegs,
      }));
    }

    return lines.join("\n");
  }, [dayLabel, route, score.badge, t]);

  const copyPlan = async () => {
    if (!planText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(planText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  const sharePlan = async () => {
    if (!planText || !canShare) {
      return;
    }

    try {
      await navigator.share({
        title: `SYNCHRONICITY'26 - ${dayLabel}`,
        text: planText,
      });
    } catch {
      // ignore aborted shares
    }
  };



  const exportPng = async () => {
    if (!exportSheetRef.current || route.totalSets === 0) {
      return;
    }

    try {
      setIsExportingPng(true);
      const dataUrl = await toPng(exportSheetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `synchronicity26-route-day${day}.png`;
      link.click();
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80">
        <div className="mx-auto max-w-md md:max-w-5xl">
          <h1 className="text-lg font-semibold tracking-tight">{t("plan.title")}</h1>
          <Tabs
            value={day}
            onValueChange={(value) => {
              setDay(value as "1" | "2");
              document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="mt-3"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900 md:max-w-sm">
              <TabsTrigger value="1">{t("plan.tabs.day1")}</TabsTrigger>
              <TabsTrigger value="2">{t("plan.tabs.day2")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 md:mx-auto md:max-w-5xl md:px-6">
        {route.totalSets === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-400">
            <p>{t("plan.empty")}</p>
            <Link
              href={`/${locale}/browse`}
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
            >
              {t("plan.browseTimetable")}
            </Link>
          </div>
        ) : (
          <>
            <Card className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      {t("plan.scoreLabel")}
                    </div>
                    <div className="text-3xl font-bold text-cyan-400">{score.badge}</div>
                    <div className="max-w-xl space-y-1.5">
                      <p className="text-sm leading-relaxed text-zinc-300">{score.advice}</p>
                      <p className="text-xs text-zinc-500">
                        {t("plan.scoreDetail", {
                          impossible: score.impossibleJumps,
                          buffer: score.averageBufferMinutes,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:max-w-[420px] xl:justify-end">
                    {canShare ? (
                      <ActionButton onClick={sharePlan} icon={<Share2 className="h-3.5 w-3.5" />}>
                        {t("plan.share")}
                      </ActionButton>
                    ) : null}
                    <ActionButton onClick={copyPlan} icon={copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}>
                      {copied ? t("plan.copied") : t("plan.copyPlan")}
                    </ActionButton>
                    <ActionButton
                      onClick={exportPng}
                      icon={<Download className="h-3.5 w-3.5" />}
                      disabled={isExportingPng}
                    >
                      {isExportingPng ? t("plan.exportingPng") : t("plan.exportPng")}
                    </ActionButton>
                    <ActionLink href={googleRouteUrl} disabled={!canOpenRoute} icon={<MapRouteIcon label="G" />}>
                      {t("plan.exportGoogleRoute")}
                    </ActionLink>
                    <ActionLink href={appleRouteUrl} disabled={!canOpenRoute} icon={<ExternalLink className="h-3.5 w-3.5" />}>
                      {t("plan.exportAppleRoute")}
                    </ActionLink>
                  </div>
                </div>
              </CardContent>
            </Card>

            <RoutePlannerPanel
              route={route}
              onToggleOption={toggleOption}
              onSelectAllInGroup={selectAllInGroup}
              onClearGroup={clearGroup}
              onFocusBranch={setFocusedBranch}
              isLoadingDirections={isLoadingDirections}
              hasRouteApiError={hasRouteApiError}
            />
          </>
        )}
      </main>

      <div className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] w-[1200px] p-6">
        <RouteExportSheet
          ref={exportSheetRef}
          route={route}
          frameSets={daySets}
          dayLabel={dayLabel}
        />
      </div>
    </div>
  );
}

function ActionButton({
  children,
  icon,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

function ActionLink({
  children,
  href,
  icon,
  disabled = false,
}: {
  children: ReactNode;
  href: string;
  icon: ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs font-medium text-zinc-600">
        {icon}
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-200"
    >
      {icon}
      {children}
    </a>
  );
}

function MapRouteIcon({ label }: { label: string }) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold">
      {label}
    </span>
  );
}
