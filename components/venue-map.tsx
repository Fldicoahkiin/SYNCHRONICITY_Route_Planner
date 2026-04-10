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

const VENUE_OFFSETS: Record<string, [number, number]> = {
  // Area A dense cluster
  "o-east": [45, -35],
  "o-east-2nd": [55, 0],
  "o-east-3f": [45, 35],
  "duo": [30, 45],
  "clubasia": [-35, -50],
  "o-west": [-45, -35],
  "7thfloor": [-55, 0],
  "o-nest": [-45, 35],
  "o-nest-2nd": [-30, 55],
  
  // Area B cluster
  "quattro": [40, -10],
  "veats": [-40, 10],
  "www": [40, -40],
  "wwwx": [-40, -10],
  "fows": [-30, 40],
  "tokio-tokyo": [40, 40],
  "linecube": [0, -45]
};

function createCalloutIcon(
  color: string,
  numbers: number[],
  venueName: string,
  offsetOffset?: [number, number]
) {
  const [ox, oy] = offsetOffset || [30, -30];
  const pinSvg = `<svg viewBox="0 0 24 24" width="20" height="24" fill="${color}" stroke="#0a0a0a" stroke-width="2" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6))"><path d="M12 2C7.03 2 3 6.03 3 11c0 6.75 9 11 9 11s9-4.25 9-11c0-4.97-4.03-9-9-9z"/><circle cx="12" cy="11" r="3" fill="#0a0a0a"/></svg>`;

  const minX = Math.min(0, ox) - 20;
  const minY = Math.min(0, oy) - 20;
  const width = Math.abs(ox) + 40;
  const height = Math.abs(oy) + 40;

  const sequenceHtml = numbers.length > 0 
    ? `<div style="background:#0a0a0a; color:#fff; border-radius:4px; padding:2px 5px; font-weight:800; font-size:10px; margin-right:4px;">${numbers.join(', ')}</div>`
    : '';

  const shortName = venueName.replace('Spotify ', '').replace(' MUSIC EXCHANGE', '').replace('SHIBUYA CLUB ', '');

  return divIcon({
    className: "",
    html: `
      <div style="position:relative; width:0; height:0;">
        <svg style="position:absolute; left:${minX}px; top:${minY}px; width:${width}px; height:${height}px; pointer-events:none; z-index:-1;">
          <line 
            x1="${-minX}" 
            y1="${-12 - minY}" 
            x2="${ox - minX}" 
            y2="${oy - minY}" 
            stroke="${color}" 
            stroke-width="2" 
            stroke-dasharray="3 3" 
            style="filter: drop-shadow(0 1px 1px rgba(0,0,0,0.8))"
          />
        </svg>
        <div style="position:absolute; left:-10px; top:-24px; width:20px; height:24px; display:flex; justify-content:center; pointer-events:auto;">
          ${pinSvg}
        </div>
        <div style="position:absolute; left:${ox}px; top:${oy}px; transform:translate(0, -50%); display:flex; align-items:center; z-index: 10;">
          <div style="transform:translateX(${ox < 0 ? '-100%' : '0'}); display:flex; align-items:center; background:rgba(24,24,27,0.95); color:#e4e4e7; padding:2px; border-radius:6px; border:1px solid ${color}60; backdrop-filter:blur(4px); box-shadow:0 2px 6px rgba(0,0,0,0.6); pointer-events:auto;">
             ${sequenceHtml}
             <div style="padding:0 4px; font-size:10px; font-weight:700; white-space:nowrap; letter-spacing:-0.2px;">${shortName}</div>
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [ox, oy - 12],
  });
}

function MapBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    let cancelled = false;

    if (points.length > 1) {
      import("leaflet").then((L) => {
        if (cancelled) return;
        try {
          map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), {
            padding: [40, 40],
            maxZoom: 17,
          });
        } catch {
          // Map may have been removed during async import
        }
      });
    } else if (points.length === 1) {
      try {
        map.setView(points[0], 16);
      } catch {
        // Map may have been removed
      }
    }

    return () => {
      cancelled = true;
    };
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

  const venueVisits = useMemo(() => {
    const visits = new Map<string, number[]>();
    if (!routeLegs?.length) return visits;

    const orderedSets = [routeLegs[0].set];
    for (const leg of routeLegs) {
      if (leg.nextSet) {
         orderedSets.push(leg.nextSet);
      }
    }

    let step = 1;
    let currentVenue = "";
    for (const set of orderedSets) {
       if (set.venueId && set.venueId !== currentVenue) {
          const list = visits.get(set.venueId) || [];
          list.push(step++);
          visits.set(set.venueId, list);
          currentVenue = set.venueId;
       }
    }
    return visits;
  }, [routeLegs]);

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
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {venues.map((v) => {
        const popupSets = sortedFavorites
          .filter((s) => s.venueId === v.id)
          .sort((a, b) => a.startAt - b.startAt);

        const visits = venueVisits.get(v.id) || [];
        const isActive = visits.length > 0 || popupSets.length > 0;

        return (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={
              isActive
                ? createCalloutIcon(v.color, visits, v.name, VENUE_OFFSETS[v.id])
                : createColorIcon(v.color)
            }
            zIndexOffset={isActive ? 1000 : 0}
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

      {routeSegments.map((segment) => segment && segment.minutes > 0 && (
        <Marker
          key={`walk-${segment.key}`}
          position={segment.midPoint}
          icon={createWalkLabelIcon(segment.minutes, t("map.minutesUnit"))}
          interactive={false}
          zIndexOffset={800}
        />
      ))}

      <MapBounds points={boundsPoints} />
    </MapContainer>
  );
}
