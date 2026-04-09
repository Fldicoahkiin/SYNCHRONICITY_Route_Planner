"use client";

import { useMemo } from "react";
import { usePersistentState } from "./use-persistent-state";

export function useFavorites() {
  const [favorites, setFavorites] = usePersistentState<Record<string, boolean>>(
    "synchronicity-favorites",
    {}
  );

  const favoriteIds = useMemo(
    () => new Set(Object.entries(favorites).filter(([, value]) => value).map(([id]) => id)),
    [favorites]
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addFavorites = (ids: string[]) => {
    setFavorites((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  };

  const clearFavorites = () => {
    setFavorites({});
  };

  return {
    favorites,
    favoriteIds,
    setFavorites,
    toggleFavorite,
    addFavorites,
    clearFavorites,
  };
}
