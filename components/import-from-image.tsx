"use client";

import { useReducer, useRef, useCallback } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { runOCR, type OCRResult } from "@/lib/utils/image-import";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, ScanLine, Check, Image as ImageIcon, AlertCircle } from "lucide-react";

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

export function ImportFromImageButton({
  onImportAction,
}: {
  onImportAction: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      dispatch({ type: "SET_IMAGE", imageUrl: url });
      dispatch({ type: "START_SCAN" });

      try {
        const result = await runOCR(url, (p) => dispatch({ type: "SET_PROGRESS", progress: p }));
        dispatch({ type: "SCAN_SUCCESS", result });
      } catch (err) {
        dispatch({ type: "SCAN_ERROR", error: err instanceof Error ? err.message : String(err) });
      }
    },
    []
  );

  const handleImport = useCallback(() => {
    const ids = Array.from(state.selectedIds);
    onImportAction(ids);
    dispatch({ type: "RESET" });
  }, [state.selectedIds, onImportAction]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => dispatch({ type: "OPEN" })}
        className="h-8 gap-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
      >
        <Upload className="h-3.5 w-3.5" />
        {t("timetable.importFromImage")}
      </Button>

      <Sheet
        open={state.open}
        onOpenChange={(v) => {
          if (!v) {
            if (state.imageUrl) URL.revokeObjectURL(state.imageUrl);
            dispatch({ type: "RESET" });
          }
        }}
      >
        <SheetContent side="bottom" className="border-zinc-800 bg-[#0a0a0a] text-zinc-100 md:max-w-md md:self-end">
          <SheetHeader>
            <SheetTitle className="text-zinc-100">{t("timetable.import.title")}</SheetTitle>
            <SheetDescription className="text-zinc-400">
              {state.stage === "select" && t("timetable.import.selectImage")}
              {state.stage === "scanning" && t("timetable.import.scanning")}
              {state.stage === "review" && t("timetable.import.reviewMatches")}
              {state.stage === "done" && t("timetable.import.done")}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-2">
            {state.stage === "select" && (
              <div className="space-y-4">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-8 text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">{t("timetable.import.tapToSelect")}</span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {state.error && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                    <AlertCircle className="h-4 w-4" />
                    {state.error}
                  </div>
                )}
              </div>
            )}

            {state.stage === "scanning" && (
              <div className="space-y-4 py-6 text-center">
                <ScanLine className="mx-auto h-8 w-8 animate-pulse text-cyan-400" />
                <div className="text-sm text-zinc-300">{t("timetable.import.scanning")}</div>
                <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${Math.max(5, Math.round(state.progress * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {state.stage === "review" && state.ocrResult && (
              <div className="space-y-4">
                {state.ocrResult.matches.length === 0 ? (
                  <div className="rounded-lg bg-zinc-900/50 px-3 py-6 text-center text-sm text-zinc-400">
                    {t("timetable.import.noMatches")}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-400">
                        {t("timetable.import.matchesFound", { count: state.ocrResult.matches.length })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span>{t("timetable.import.dayLabel")}:</span>
                        <select
                          value={state.dayOverride ?? ""}
                          onChange={(e) => dispatch({ type: "SET_DAY", day: e.target.value ? Number(e.target.value) as 1 | 2 : null })}
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 outline-none focus:border-cyan-500"
                        >
                          <option value="">{t("timetable.import.dayAuto")}</option>
                          <option value="1">{t("timetable.tabs.day1")}</option>
                          <option value="2">{t("timetable.tabs.day2")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {state.ocrResult.matches.map((match) => {
                        const visibleSets = state.dayOverride
                          ? match.sets.filter((s) => s.day === state.dayOverride)
                          : match.sets;
                        if (visibleSets.length === 0) return null;
                        const allIds = visibleSets.map((s) => s.id);
                        const checked = allIds.every((id) => state.selectedIds.has(id));
                        return (
                          <button
                            key={match.artistName}
                            onClick={() => dispatch({ type: "TOGGLE_ALL", ids: allIds })}
                            className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
                          >
                            <div>
                              <div className="text-sm font-medium text-zinc-200">{match.artistName}</div>
                              <div className="text-[10px] text-zinc-500">{match.rawLine}</div>
                            </div>
                            <div
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                                checked
                                  ? "border-cyan-500 bg-cyan-500 text-zinc-900"
                                  : "border-zinc-600 bg-transparent"
                              )}
                            >
                              {checked && <Check className="h-3.5 w-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-zinc-800">
            {state.stage === "review" && (
              <Button
                onClick={handleImport}
                disabled={state.selectedIds.size === 0}
                className="w-full bg-cyan-500 text-zinc-900 hover:bg-cyan-400 disabled:opacity-50"
              >
                {t("timetable.import.confirm", { count: state.selectedIds.size })}
              </Button>
            )}
            {state.stage !== "scanning" && state.stage !== "review" && (
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: "RESET" })}
                className="w-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              >
                {t("timetable.import.cancel")}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
