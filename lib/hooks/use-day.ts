import { usePersistentState } from "./use-persistent-state";

export function useDay() {
  return usePersistentState<"1" | "2">("synchronicity-day", "1");
}
