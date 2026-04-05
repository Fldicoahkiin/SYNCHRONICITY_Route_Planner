"use client";

import { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { type LatLngExpression, divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { venues, venueMap } from "@/lib/data/venues";
import type { TimetableSet } from "@/lib/data/timetable";
import { getWalkMinutes } from "@/lib/data/walking-matrix";
import { useTranslation } from "@/lib/i18n/client";
import { formatTime } from "@/lib/utils/route-planner";

function createColorIcon(color: string) {
  return divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0a0a0a;box-shadow:0 1px 3px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7],
  });
}

function createWalkLabelIcon(minutes: number, unit: string) {
  const text = `${minutes}${unit}`;
  const width = Math.max(40, text.length * 7 + 12);
  return divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;padding:0 6px;height:18px;border-radius:999px;background:rgba(10,10,10,0.85);color:#22d3ee;font-weight:600;font-size:10px;border:1px solid rgba(34,211,238,0.5);box-shadow:0 1px 3px rgba(0,0,0,0.5);white-space:nowrap;">${text}</div>`,
    iconSize: [width, 18],
    iconAnchor: [width / 2, 9],
  });
}

function createNumberedIcon(color: string, number: number) {
  return divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${color};color:#0a0a0a;font-weight:700;font-size:12px;border:2px solid #0a0a0a;box-shadow:0 1px 3px rgba(0,0,0,0.5);">${number}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

function MapBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  if (points.length > 1) {
    import("leaflet").then((L) => {
      map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), {
        padding: [40, 40],
        maxZoom: 17,
      });
    });
  } else if (points.length === 1) {
    map.setView(points[0], 16);
  }
  return null;
}

export default function VenueMap({
  favorites,
  daySets,
}: {
  favorites: TimetableSet[];
  daySets?: TimetableSet[];
}) {
  const { t } = useTranslation();
  const sortedFavorites = useMemo(
    () => [...favorites].sort((a, b) => a.startAt - b.startAt),
    [favorites]
  );

  const routeVenueIds = useMemo(() => {
    const ids = sortedFavorites
      .map((s) => s.venueId)
      .filter((v): v is string => !!v);
    return [...new Set(ids)];
  }, [sortedFavorites]);

  const routePoints: LatLngExpression[] = useMemo(() => {
    return routeVenueIds
      .map((id) => venueMap.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map((v) => [v.lat, v.lng]);
  }, [routeVenueIds]);

  const boundsPoints = routePoints.length > 0 ? routePoints : venues.map((v) => [v.lat, v.lng] as LatLngExpression);

  const favoriteIds = useMemo(() => new Set(favorites.map((s) => s.id)), [favorites]);

  return (
    <MapContainer
      center={[35.6605, 139.6975]}
      zoom={16}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {venues.map((v) => {
        const routeIndex = routeVenueIds.indexOf(v.id);
        const isOnRoute = routeIndex !== -1;
        const popupSets = daySets
          ? daySets
              .filter((s) => s.venueId === v.id)
              .sort((a, b) => a.startAt - b.startAt)
          : sortedFavorites.filter((s) => s.venueId === v.id);

        return (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={
              isOnRoute
                ? createNumberedIcon(v.color, routeIndex + 1)
                : createColorIcon(v.color)
            }
            opacity={1}
          >
            <Popup>
              <div className="min-w-[160px] text-zinc-900">
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-zinc-600">
                  {v.area === "A"
                    ? t("timetable.areaA")
                    : v.area === "B"
                    ? t("timetable.areaB")
                    : t("timetable.areaOther")}
                </div>
                {popupSets.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-zinc-200 pt-2">
                    {popupSets.map((s) => {
                      const isFav = favoriteIds.has(s.id);
                      return (
                        <div key={s.id} className="text-xs">
                          <div className={isFav ? "font-bold text-cyan-700" : "font-medium text-zinc-800"}>
                            {s.artistName}
                            {isFav && <span className="ml-1 text-[10px] text-cyan-600">★</span>}
                          </div>
                          <div className="text-zinc-500">
                            {formatTime(s.startAt)} - {formatTime(s.finishAt)} @{s.stageName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {routePoints.length > 1 &&
        routePoints.slice(0, -1).map((from, idx) => {
          const to = routePoints[idx + 1];
          return (
            <Polyline
              key={idx}
              positions={[from, to]}
              pathOptions={{
                color: "#22d3ee",
                weight: 4,
                opacity: 0.8,
                dashArray: "6 6",
              }}
            />
          );
        })}

      {routePoints.length > 1 &&
        routePoints.slice(0, -1).map((from, idx) => {
          const to = routePoints[idx + 1];
          const fromVenueId = routeVenueIds[idx];
          const toVenueId = routeVenueIds[idx + 1];
          const minutes = getWalkMinutes(fromVenueId, toVenueId);
          const [lat1, lng1] = from as [number, number];
          const [lat2, lng2] = to as [number, number];
          const mid: LatLngExpression = [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
          return (
            <Marker
              key={`walk-${idx}`}
              position={mid}
              icon={createWalkLabelIcon(minutes, t("map.minutesUnit"))}
              opacity={1}
              interactive={false}
            />
          );
        })}

      <MapBounds points={boundsPoints} />
    </MapContainer>
  );
}
