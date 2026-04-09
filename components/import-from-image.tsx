"use client";

import { useReducer, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/client";
import { runOCR, type OCRResult } from "@/lib/utils/image-import";
import { timetable } from "@/lib/data/timetable";
import { formatTime } from "@/lib/utils/route-planner";
import { cn } from "@/lib/utils";
import { Modal, Button, Chip } from "@heroui/react";
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

export function ImportFromImageButton({
  onImportAction,
}: {
  onImportAction: (ids: string[]) => void;
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
      }
    },
    []
  );

  const handleImport = useCallback(() => {
    const ids = Array.from(state.selectedIds);
    onImportAction(ids);
    dispatch({ type: "RESET" });
  }, [state.selectedIds, onImportAction]);

  const conflictsInfo = useMemo(() => {
    if (!state.ocrResult || state.selectedIds.size < 2) return null;
    const items = timetable
      .filter((set) => state.selectedIds.has(set.id))
      .filter((set) => (state.dayOverride ? set.day === state.dayOverride : true))
      .sort((a, b) => a.startAt - b.startAt);

    const conflicts: Array<{
      left: string;
      right: string;
      time: string;
    }> = [];
    for (let i = 0; i < items.length - 1; i++) {
      if (
        items[i].day === items[i + 1].day &&
        items[i].finishAt > items[i + 1].startAt
      ) {
        conflicts.push({
          left: items[i].artistName,
          right: items[i + 1].artistName,
          time: `${formatTime(items[i + 1].startAt)} - ${formatTime(
            items[i].finishAt,
          )}`,
        });
      }
    }
    return conflicts;
  }, [state.selectedIds, state.ocrResult, state.dayOverride]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);


  return (
    <>
      <Button
        onPress={() => dispatch({ type: "OPEN" })}
        variant="outline"
        className="text-xs font-semibold bg-zinc-800/80 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 border-zinc-700 hover:border-zinc-500"
      >
        <Upload className="h-3.5 w-3.5" />
        {t("timetable.importFromImage")}
      </Button>

      <Modal.Root
        isOpen={state.open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            if (objectUrlRef.current) {
              URL.revokeObjectURL(objectUrlRef.current);
              objectUrlRef.current = null;
            }
            dispatch({ type: "RESET" });
          }
        }}
      >
        <Modal.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Modal.Container className="fixed inset-x-0 bottom-0 z-50 w-full sm:bottom-auto sm:inset-y-auto sm:top-[50%] sm:left-[50%] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-md bg-[#0a0a0a] border border-zinc-800 sm:rounded-2xl rounded-t-2xl shadow-2xl">
          <Modal.Dialog className="outline-none">
            {({ close }) => (
              <div className="relative">
                <Modal.CloseTrigger className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
                  <X className="w-4 h-4" />
                </Modal.CloseTrigger>
                <Modal.Header className="flex flex-col gap-1.5 p-5 border-b border-zinc-800/50 pr-14">
                  <Modal.Heading className="text-xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                    {t("timetable.import.title")}
                  </Modal.Heading>
                  <div className="text-sm font-medium text-zinc-500">
                    {state.stage === "select" && t("timetable.import.selectImage")}
                    {state.stage === "scanning" && t("timetable.import.scanning")}
                    {state.stage === "review" && t("timetable.import.reviewMatches")}
                    {state.stage === "done" && t("timetable.import.done")}
                  </div>
                </Modal.Header>

                <Modal.Body className="py-6 px-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {state.stage === "select" && (
                    <div className="space-y-4">
                      <button
                        onClick={openFilePicker}
                        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-10 transition-colors hover:border-cyan-500/40 hover:bg-zinc-950 group"
                      >
                        <div className="rounded-full bg-zinc-900 p-3 transition-colors group-hover:bg-cyan-500/10">
                          <ImageIcon className="h-8 w-8 text-zinc-400 group-hover:text-cyan-400" />
                        </div>
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-cyan-200">
                          {t("timetable.import.tapToSelect")}
                        </span>
                      </button>
                      {state.error && (
                        <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400 border border-rose-500/20">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          {state.error}
                        </div>
                      )}
                    </div>
                  )}

                  {state.stage === "scanning" && (
                    <div className="flex flex-col items-center justify-center space-y-5 py-2 text-center">
                      {state.imageUrl && (
                        <div className="w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                          <Image
                            src={state.imageUrl}
                            alt="Timetable screenshot"
                            width={1200}
                            height={2400}
                            unoptimized
                            className="h-48 w-full object-contain"
                          />
                        </div>
                      )}

                      <div className="space-y-3">
                        <ScanLine className="mx-auto h-10 w-10 animate-pulse text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.35)]" />
                        <div className="text-sm text-zinc-400">
                          {t("timetable.import.scanning")}
                        </div>
                      </div>

                      <div className="relative h-1.5 w-48 overflow-hidden rounded-full bg-zinc-800">
                        {state.progress === 0 ? (
                          <div className="absolute top-0 left-0 h-full w-1/3 bg-cyan-500 rounded-full animate-[progress_1s_ease-in-out_infinite]" />
                        ) : (
                          <div 
                            className="absolute top-0 left-0 h-full bg-cyan-500 rounded-full transition-all duration-300"
                            style={{ width: `${state.progress * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {state.stage === "review" && state.ocrResult && (
                    <div className="space-y-4">
                      {state.imageUrl && (
                        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                          <Image
                            src={state.imageUrl}
                            alt="Timetable screenshot"
                            width={1200}
                            height={2400}
                            unoptimized
                            className="h-44 w-full object-contain"
                          />
                        </div>
                      )}

                      {state.ocrResult.matches.length === 0 ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm font-medium text-zinc-400">
                          {t("timetable.import.noMatches")}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mt-2">
                            <Chip
                              size="sm"
                              variant="soft"
                              color="accent"
                              className="font-semibold text-xs tracking-wide uppercase"
                            >
                              {t("timetable.import.matchesFound", {
                                count: state.ocrResult.matches.length,
                              })}
                            </Chip>
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                              <span>{t("timetable.import.dayLabel")}:</span>
                              <select
                                value={state.dayOverride ?? ""}
                                onChange={(e) => dispatch({ type: "SET_DAY", day: e.target.value ? Number(e.target.value) as 1 | 2 : null })}
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-200 outline-none focus:border-cyan-500 hover:border-zinc-500 transition-colors"
                              >
                                <option value="">{t("timetable.import.dayAuto")}</option>
                                <option value="1">{t("timetable.tabs.day1")}</option>
                                <option value="2">{t("timetable.tabs.day2")}</option>
                              </select>
                            </div>
                          </div>

                          {conflictsInfo && conflictsInfo.length > 0 && (
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-500 mb-2">
                              <div className="mb-1.5 flex items-center gap-1.5 font-bold">
                                <AlertCircle className="h-4 w-4" />
                                {t("timetable.import.conflictWarning")}
                              </div>
                              <ul className="space-y-2 text-xs">
                                {conflictsInfo.map((conflict) => (
                                  <li
                                    key={`${conflict.left}-${conflict.right}-${conflict.time}`}
                                    className="rounded-lg border border-amber-500/15 bg-black/10 px-2.5 py-2"
                                  >
                                    <div className="font-medium text-amber-200">
                                      {conflict.left} · {conflict.right}
                                    </div>
                                    <div className="mt-0.5 text-amber-300/80">
                                      {conflict.time}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="space-y-2 pr-2">
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
                                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                                >
                                  <div>
                                    <div className="text-sm font-bold text-zinc-200">{match.artistName}</div>
                                    <div className="text-[10px] text-zinc-500 font-medium">({match.rawLine})</div>
                                  </div>
                                  <div
                                    className={cn(
                                      "flex h-5 w-5 shrink-0 items-center justify-center rounded transition-all",
                                      checked
                                        ? "border-cyan-500 bg-cyan-500 text-[#0a0a0a] shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                                        : "border-2 border-zinc-700 bg-transparent"
                                    )}
                                  >
                                    {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer className="flex flex-col sm:flex-row gap-3 p-5 border-t border-zinc-800/50">
                  {state.stage === "review" && state.ocrResult && state.ocrResult.matches.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        onPress={openFilePicker}
                        className="w-full sm:w-auto text-zinc-300 hover:text-zinc-100 font-medium"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("timetable.import.tapToSelect")}
                      </Button>
                      <Button
                        onPress={() => {
                          handleImport();
                          close();
                        }}
                        isDisabled={state.selectedIds.size === 0}
                        className="w-full sm:w-auto font-bold shadow-lg bg-cyan-500 text-white hover:bg-cyan-600"
                      >
                        {t("timetable.import.confirm", {
                          count: state.selectedIds.size,
                        })}
                      </Button>
                    </>
                  )}
                  {state.stage !== "scanning" && (
                    <Button
                      variant="ghost"
                      onPress={close}
                      className="w-full sm:w-auto text-zinc-400 hover:text-zinc-200 font-medium"
                    >
                      {t("timetable.import.cancel")}
                    </Button>
                  )}
                </Modal.Footer>
              </div>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Root>
    </>
  );
}
