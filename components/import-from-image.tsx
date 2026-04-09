"use client";

import { useReducer, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";
import { runOCR, type OCRResult } from "@/lib/utils/image-import";
import { timetable } from "@/lib/data/timetable";
import { useFavorites } from "@/lib/hooks/use-favorites";
import { formatTime } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload,
  ScanLine,
  Check,
  Image as ImageIcon,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";

type Stage = "select" | "scanning" | "review" | "done";

interface State {
  open: boolean;
  stage: Stage;
  imageUrl: string | null;
  ocrResult: OCRResult | null;
  selectedIds: Set<string>;
  dayOverride: 1 | 2 | null;
  progress: number;
  error: string | null;
}

type Action =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_IMAGE"; imageUrl: string }
  | { type: "START_SCAN" }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "SCAN_SUCCESS"; result: OCRResult }
  | { type: "SCAN_ERROR"; error: string }
  | { type: "TOGGLE_ID"; id: string }
  | { type: "TOGGLE_ALL"; ids: string[] }
  | { type: "SET_DAY"; day: 1 | 2 | null }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "OPEN":
      return { ...state, open: true };
    case "CLOSE":
      if (state.stage === "select" || state.stage === "done") {
        return { ...state, open: false };
      }
      return state;
    case "SET_IMAGE":
      return { ...state, imageUrl: action.imageUrl, stage: "select", error: null };
    case "START_SCAN":
      return { ...state, stage: "scanning", progress: 0, error: null };
    case "SET_PROGRESS":
      return { ...state, progress: action.progress };
    case "SCAN_SUCCESS": {
      const allIds = action.result.matches.flatMap((m) => m.sets.map((s) => s.id));
      return {
        ...state,
        stage: "review",
        ocrResult: action.result,
        selectedIds: new Set(allIds),
        dayOverride: action.result.day,
      };
    }
    case "SCAN_ERROR":
      return { ...state, stage: "select", error: action.error };
    case "TOGGLE_ID": {
      const next = new Set(state.selectedIds);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selectedIds: next };
    }
    case "TOGGLE_ALL": {
      const allSelected = action.ids.every((id) => state.selectedIds.has(id));
      const next = new Set(state.selectedIds);
      action.ids.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return { ...state, selectedIds: next };
    }
    case "SET_DAY":
      return { ...state, dayOverride: action.day };
    case "RESET":
      return {
        open: false,
        stage: "select",
        imageUrl: null,
        ocrResult: null,
        selectedIds: new Set(),
        dayOverride: null,
        progress: 0,
        error: null,
      };
    default:
      return state;
  }
}

const initialState: State = {
  open: false,
  stage: "select",
  imageUrl: null,
  ocrResult: null,
  selectedIds: new Set(),
  dayOverride: null,
  progress: 0,
  error: null,
};

function ImportTriggerButton() {
  const { t } = useTranslation();

  return (
    <>
      <Upload className="h-3.5 w-3.5" />
      {t("timetable.importFromImage")}
    </>
  );
}

function ImportModalHeader({ stage }: { stage: Stage }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1.5 border-b border-zinc-800/50 p-5 pr-14">
      <div className="bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-xl font-bold text-transparent">
        {t("timetable.import.title")}
      </div>
      <div className="text-sm font-medium text-zinc-500">
        {stage === "select" && t("timetable.import.selectImage")}
        {stage === "scanning" && t("timetable.import.scanning")}
        {stage === "review" && t("timetable.import.reviewMatches")}
        {stage === "done" && t("timetable.import.done")}
      </div>
    </div>
  );
}

function ImportSelectState({
  error,
  inputRef,
  onFileChange,
  onOpenFilePicker,
}: {
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenFilePicker: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        onClick={onOpenFilePicker}
        className="group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-10 transition-colors hover:border-cyan-500/40 hover:bg-zinc-950"
      >
        <div className="rounded-full bg-zinc-900 p-3 transition-colors group-hover:bg-cyan-500/10">
          <ImageIcon className="h-8 w-8 text-zinc-400 group-hover:text-cyan-400" />
        </div>
        <span className="text-sm font-medium text-zinc-300 group-hover:text-cyan-200">
          {t("timetable.import.tapToSelect")}
        </span>
      </button>
      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      ) : null}
    </div>
  );
}

function ImportScanningState({
  imageUrl,
  progress,
}: {
  imageUrl: string | null;
  progress: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center space-y-5 py-2 text-center">
      {imageUrl ? (
        <div className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <Image
            src={imageUrl}
            alt="Timetable screenshot"
            width={1200}
            height={2400}
            className="h-48 w-full object-contain"
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <ScanLine className="mx-auto h-10 w-10 animate-pulse text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.35)]" />
        <div className="text-sm text-zinc-400">{t("timetable.import.scanning")}</div>
      </div>

      <div className="relative h-1.5 w-48 overflow-hidden rounded-full bg-zinc-800">
        {progress === 0 ? (
          <div className="absolute left-0 top-0 h-full w-1/3 animate-[progress_1s_ease-in-out_infinite] rounded-full bg-cyan-500" />
        ) : (
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

function ImportReviewState({
  imageUrl,
  ocrResult,
  selectedIds,
  dayOverride,
  conflicts,
  onOpenFilePicker,
  onSetDay,
  onToggleMatch,
}: {
  imageUrl: string | null;
  ocrResult: OCRResult;
  selectedIds: Set<string>;
  dayOverride: 1 | 2 | null;
  conflicts: Array<{ labels: string[]; time: string }> | null;
  onOpenFilePicker: () => void;
  onSetDay: (day: 1 | 2 | null) => void;
  onToggleMatch: (ids: string[]) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <Image
            src={imageUrl}
            alt="Timetable screenshot"
            width={1200}
            height={2400}
            className="h-44 w-full object-contain"
          />
        </div>
      ) : null}

      {ocrResult.matches.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm font-medium text-zinc-400">
          {t("timetable.import.noMatches")}
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-between">
            <Badge className="text-xs font-semibold uppercase tracking-wide border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
              {t("timetable.import.matchesFound", {
                count: ocrResult.matches.length,
              })}
            </Badge>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <span>{t("timetable.import.dayLabel")}:</span>
              <select
                value={dayOverride ?? ""}
                onChange={(event) => onSetDay(event.target.value ? (Number(event.target.value) as 1 | 2) : null)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 outline-none transition-colors hover:border-zinc-500 focus:border-cyan-500"
              >
                <option value="">{t("timetable.import.dayAuto")}</option>
                <option value="1">{t("timetable.tabs.day1")}</option>
                <option value="2">{t("timetable.tabs.day2")}</option>
              </select>
            </div>
          </div>

          {conflicts && conflicts.length > 0 ? (
            <div className="mb-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-500">
              <div className="mb-1.5 flex items-center gap-1.5 font-bold">
                <AlertCircle className="h-4 w-4" />
                {t("timetable.import.conflictWarning")}
              </div>
              <ul className="space-y-2 text-xs">
                {conflicts.map((conflict, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-amber-500/15 bg-black/10 px-2.5 py-2"
                  >
                    <div className="font-medium text-amber-200">
                      {conflict.labels.join(" · ")}
                    </div>
                    <div className="mt-0.5 text-amber-300/80">{conflict.time}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 pr-2">
            {ocrResult.matches.map((match) => {
              const visibleSets = dayOverride
                ? match.sets.filter((set) => set.day === dayOverride)
                : match.sets;

              if (visibleSets.length === 0) {
                return null;
              }

              const ids = visibleSets.map((set) => set.id);
              const checked = ids.every((id) => selectedIds.has(id));

              return (
                <button
                  key={match.artistName}
                  onClick={() => onToggleMatch(ids)}
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                >
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{match.artistName}</div>
                    <div className="text-[10px] font-medium text-zinc-500">({match.rawLine})</div>
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all",
                      checked
                        ? "border-cyan-500 bg-cyan-500 text-[#0a0a0a] shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                        : "border-2 border-zinc-700 bg-transparent",
                    )}
                  >
                    {checked ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : null}
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            onClick={onOpenFilePicker}
            className="w-full text-zinc-300 hover:text-zinc-100 sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            {t("timetable.import.tapToSelect")}
          </Button>
        </>
      )}
    </div>
  );
}

function ImportModalFooter({
  stage,
  selectedCount,
  onImport,
  onClose,
}: {
  stage: Stage;
  selectedCount: number;
  onImport: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-800/50 p-5 sm:flex-row">
      {stage === "review" ? (
        <Button
          onClick={onImport}
          disabled={selectedCount === 0}
          className="w-full bg-cyan-500 font-bold text-white shadow-lg hover:bg-cyan-600 sm:w-auto"
        >
          {t("timetable.import.confirm", { count: selectedCount })}
        </Button>
      ) : null}
      {stage !== "scanning" ? (
        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full font-medium text-zinc-400 hover:text-zinc-200 sm:w-auto"
        >
          {t("timetable.import.cancel")}
        </Button>
      ) : null}
    </div>
  );
}

export function ImportFromImageButton({
  onDayChange,
}: {
  onDayChange?: (day: "1" | "2") => void;
}) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      dispatch({ type: "SET_IMAGE", imageUrl: url });
      dispatch({ type: "START_SCAN" });

      try {
        const result = await runOCR(url, (p) => dispatch({ type: "SET_PROGRESS", progress: p }));
        dispatch({ type: "SCAN_SUCCESS", result });
      } catch (err) {
        dispatch({ type: "SCAN_ERROR", error: err instanceof Error ? err.message : String(err) });
      } finally {
        // allow re-selecting the same file later
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    []
  );

  const { addFavorites } = useFavorites();

  const handleImport = useCallback(() => {
    const ids = Array.from(state.selectedIds);
    addFavorites(ids);

    if (state.dayOverride && onDayChange) {
      onDayChange(String(state.dayOverride) as "1" | "2");
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    dispatch({ type: "RESET" });
  }, [state.selectedIds, state.dayOverride, addFavorites, onDayChange]);

  const conflictsInfo = useMemo(() => {
    if (!state.ocrResult || state.selectedIds.size < 2) return null;
    const items = timetable
      .filter((set) => state.selectedIds.has(set.id))
      .filter((set) => (state.dayOverride ? set.day === state.dayOverride : true))
      .sort((a, b) => a.startAt - b.startAt);

    const conflicts: Array<{
      labels: string[];
      time: string;
    }> = [];
    
    let currentCluster: typeof items = [];
    let clusterEnd = -1;

    for (const item of items) {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
        clusterEnd = item.finishAt;
      } else {
        const firstItem = currentCluster[0];
        if (item.day === firstItem.day && item.startAt < clusterEnd) {
          currentCluster.push(item);
          clusterEnd = Math.max(clusterEnd, item.finishAt);
        } else {
          if (currentCluster.length > 1) {
            const overlapStart = Math.max(...currentCluster.map(x => x.startAt));
            const overlapEnd = Math.min(...currentCluster.map(x => x.finishAt));
            const timeSpan = overlapStart < overlapEnd 
              ? `${formatTime(overlapStart)} - ${formatTime(overlapEnd)}`
              : `${formatTime(currentCluster[0].startAt)} - ${formatTime(clusterEnd)}`;

            conflicts.push({
              labels: currentCluster.map(x => x.artistName),
              time: timeSpan,
            });
          }
          currentCluster = [item];
          clusterEnd = item.finishAt;
        }
      }
    }

    if (currentCluster.length > 1) {
      const overlapStart = Math.max(...currentCluster.map(x => x.startAt));
      const overlapEnd = Math.min(...currentCluster.map(x => x.finishAt));
      const timeSpan = overlapStart < overlapEnd 
        ? `${formatTime(overlapStart)} - ${formatTime(overlapEnd)}`
        : `${formatTime(currentCluster[0].startAt)} - ${formatTime(clusterEnd)}`;

      conflicts.push({
        labels: currentCluster.map(x => x.artistName),
        time: timeSpan,
      });
    }
    
    return conflicts;
  }, [state.selectedIds, state.ocrResult, state.dayOverride]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      dispatch({ type: "RESET" });
    }
  }, []);

  return (
    <>
      <Button
        onClick={() => dispatch({ type: "OPEN" })}
        variant="outline"
        className="flex h-8 items-center justify-center gap-1.5 rounded-lg border-zinc-700 bg-zinc-800/80 px-3 text-xs font-semibold text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-100"
      >
        <ImportTriggerButton />
      </Button>

      <Dialog open={state.open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="fixed inset-x-0 bottom-0 z-50 w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border border-zinc-800 bg-background p-0 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <DialogTitle className="sr-only">
            {t("timetable.import.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("timetable.import.selectImage")}
          </DialogDescription>
          <div className="relative">
            <DialogClose
              aria-label={t("common.close")}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 outline-none transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </DialogClose>
            <ImportModalHeader stage={state.stage} />

            <div className="px-5 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {state.stage === "select" ? (
                <ImportSelectState
                  error={state.error}
                  inputRef={inputRef}
                  onFileChange={handleFileChange}
                  onOpenFilePicker={openFilePicker}
                />
              ) : null}

              {state.stage === "scanning" ? (
                <ImportScanningState imageUrl={state.imageUrl} progress={state.progress} />
              ) : null}

              {state.stage === "review" && state.ocrResult ? (
                <ImportReviewState
                  imageUrl={state.imageUrl}
                  ocrResult={state.ocrResult}
                  selectedIds={state.selectedIds}
                  dayOverride={state.dayOverride}
                  conflicts={conflictsInfo}
                  onOpenFilePicker={openFilePicker}
                  onSetDay={(day) => dispatch({ type: "SET_DAY", day })}
                  onToggleMatch={(ids) => dispatch({ type: "TOGGLE_ALL", ids })}
                />
              ) : null}
            </div>

            <ImportModalFooter
              stage={state.stage}
              selectedCount={state.selectedIds.size}
              onImport={() => {
                handleImport();
              }}
              onClose={() => handleOpenChange(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
