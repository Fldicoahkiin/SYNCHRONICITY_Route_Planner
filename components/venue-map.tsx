"use client";

import { useEffect, useMemo } from "react";
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
import { useTranslation } from "@/lib/i18n/client";
import { formatTime, type RouteLeg } from "@/lib/utils/route-planner";

function createColorIcon(color: string) {
  const pinSvg = `<svg viewBox="0 0 24 24" width="16" height="20" fill="${color}" stroke="#18181b" stroke-width="2" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5))"><path d="M12 2C7.03 2 3 6.03 3 11c0 6.75 9 11 9 11s9-4.25 9-11c0-4.97-4.03-9-9-9z"/><circle cx="12" cy="11" r="3" fill="#18181b"/></svg>`;
  return divIcon({
    className: "",
    html: `<div style="display:flex;justify-content:center;opacity:0.8;margin-left:-8px;margin-top:-20px;">${pinSvg}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -20],
  });
}

function createWalkLabelIcon(minutes: number, unit: string) {
  const text = `${minutes}${unit}`;
  const width = Math.max(28, text.length * 6 + 8);
  return divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;padding:0 4px;height:14px;border-radius:999px;background:rgba(10,10,10,0.85);color:rgba(160,160,160,0.95);font-weight:600;font-size:8px;white-space:nowrap;border: 1px solid rgba(255,255,255,0.1)">${text}</div>`,
    iconSize: [width, 14],
    iconAnchor: [width / 2, 7],
  });
}

function createNumberedIcon(color: string, number: number, venueName: string) {
  const pinSvg = `<svg viewBox="0 0 24 24" width="24" height="28" fill="${color}" stroke="#0a0a0a" stroke-width="2" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6))"><path d="M12 2C7.03 2 3 6.03 3 11c0 6.75 9 11 9 11s9-4.25 9-11c0-4.97-4.03-9-9-9z"/></svg>`;
  return divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;margin-left:-12px;margin-top:-28px;pointer-events:none;">
        <div style="position:relative;width:24px;height:28px;display:flex;justify-content:center;pointer-events:auto;">
          ${pinSvg}
          <div style="position:absolute;top:3px;font-weight:800;font-size:11px;color:#0a0a0a;letter-spacing:-0.5px;">${number}</div>
        </div>
        <div style="background:rgba(24,24,27,0.95);color:#e4e4e7;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;white-space:nowrap;margin-left:2px;border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(4px);box-shadow:0 1px 3px rgba(0,0,0,0.4);pointer-events:auto;">${venueName}</div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -28],
  });
}

function MapBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
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
  }, [map, points]);

  return null;
}

export default function VenueMap({
  favorites,
  routeLegs,
}: {
  favorites: TimetableSet[];
  routeLegs?: RouteLeg[];
}) {
  const { t } = useTranslation();
  const sortedFavorites = useMemo(
    () => [...favorites].sort((a, b) => a.startAt - b.startAt),
    [favorites]
  );

  const routeVenueIds = useMemo(() => {
    const sourceSets = routeLegs?.length ? routeLegs.map((leg) => leg.set) : sortedFavorites;
    const ids = sourceSets.map((s) => s.venueId).filter((v): v is string => !!v);
    return [...new Set(ids)];
  }, [routeLegs, sortedFavorites]);

  const routeSegments = useMemo(
    () =>
      (routeLegs ?? [])
        .filter((leg) => leg.nextSet && leg.set.venueId && leg.nextSet.venueId)
        .map((leg) => {
          const fromVenue = venueMap.get(leg.set.venueId || "");
          const toVenue = venueMap.get(leg.nextSet?.venueId || "");

          if (!fromVenue || !toVenue) {
            return null;
          }

          const positions: LatLngExpression[] =
            leg.geometry && leg.geometry.length > 1
              ? leg.geometry
              : ([
                  [fromVenue.lat, fromVenue.lng],
                  [toVenue.lat, toVenue.lng],
                ] as LatLngExpression[]);

          const midIndex = Math.floor(positions.length / 2);
          const midPoint = positions[midIndex];

          return {
            key: `${leg.set.id}-${leg.nextSet?.id}`,
            positions,
            midPoint,
            minutes: leg.walkMinutes,
            status: leg.status,
          };
        })
        .filter(Boolean),
    [routeLegs],
  );

  const boundsPoints = [
    ...venues.map((v) => [v.lat, v.lng] as LatLngExpression),
    ...routeSegments.filter((segment): segment is NonNullable<typeof segment> => !!segment).flatMap((segment) => segment.positions),
  ];

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
        crossOrigin="anonymous"
        url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
      />

      {venues.map((v) => {
        const routeIndex = routeVenueIds.indexOf(v.id);
        const isOnRoute = routeIndex !== -1;
        const popupSets = sortedFavorites
          .filter((s) => s.venueId === v.id)
          .sort((a, b) => a.startAt - b.startAt);

        return (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={
              isOnRoute
                ? createNumberedIcon(v.color, routeIndex + 1, v.name.split(" ").pop() || v.name)
                : createColorIcon(v.color)
            }
            zIndexOffset={isOnRoute ? 1000 : 0}
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

      {routeSegments.map((segment) => segment && (
        <Polyline
          key={segment.key}
          positions={segment.positions}
          pathOptions={{
            color:
              segment.status === "impossible"
                ? "#fb7185"
                : segment.status === "tight"
                  ? "#f59e0b"
                  : "#0ea5e9",
            weight: 3,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
            dashArray: segment.status === "impossible" ? "6 8" : undefined,
          }}
        />
      ))}

      {routeSegments.map((segment) => segment && (
        <Marker
          key={`walk-${segment.key}`}
          position={segment.midPoint}
          icon={createWalkLabelIcon(segment.minutes, t("map.minutesUnit"))}
          opacity={1}
          interactive={false}
          zIndexOffset={500}
        />
      ))}

      <MapBounds points={boundsPoints} />
    </MapContainer>
  );
}
