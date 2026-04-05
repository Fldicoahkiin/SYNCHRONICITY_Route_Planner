import useLocalStorageState from "use-local-storage-state";

export function useDay() {
  return useLocalStorageState<"1" | "2">("synchronicity-day", {
    defaultValue: "1",
  });
}
