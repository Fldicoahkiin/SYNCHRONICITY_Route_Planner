"use client";

import Image from "next/image";
import { useMemo } from "react";
import { verifiedVenueMap } from "@/lib/data/venues-verified";
import type { TimetableSet } from "@/lib/data/timetable";
import { useTranslation } from "@/lib/i18n/client";
import { formatTime, type RouteLeg } from "@/lib/utils/route-planner";
import { MapPin } from "lucide-react";

interface GoogleMapsEmbedProps {
  favorites: TimetableSet[];
  daySets?: TimetableSet[];
  routeLegs?: RouteLeg[];
  className?: string;
}

/**
 * Google Maps embedded component for venue display
 * Replaces the Leaflet-based venue map with Google Maps
 */
export default function GoogleMapsEmbed({
  favorites,
  daySets,
  routeLegs,
  className = "",
}: GoogleMapsEmbedProps) {
  const { t } = useTranslation();

  const sortedFavorites = useMemo(
    () => [...favorites].sort((a, b) => a.startAt - b.startAt),
    [favorites]
  );

  const routeVenueIds = useMemo(() => {
    const sourceSets = routeLegs?.length
      ? routeLegs.map((leg) => leg.set)
      : sortedFavorites;
    const ids = sourceSets
      .map((s) => s.venueId)
      .filter((v): v is string => !!v);
    return [...new Set(ids)];
  }, [routeLegs, sortedFavorites]);

  // Build map center - average of all venues in route
  const mapCenter = useMemo(() => {
    if (routeVenueIds.length === 0) {
      // Default to Shibuya center
      return { lat: 35.6595, lng: 139.7004, zoom: 15 };
    }

    const venues = routeVenueIds
      .map((id) => verifiedVenueMap.get(id))
      .filter((v): v is NonNullable<typeof v> => !!v);

    if (venues.length === 0) {
      return { lat: 35.6595, lng: 139.7004, zoom: 15 };
    }

    // Calculate bounds
    const lats = venues.map((v) => v.lat);
    const lngs = venues.map((v) => v.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calculate appropriate zoom level based on bounds
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    let zoom = 16;
    if (maxDiff < 0.003) {
      zoom = 17;
    } else if (maxDiff < 0.01) {
      zoom = 16;
    } else if (maxDiff < 0.02) {
      zoom = 15;
    } else {
      zoom = 14;
    }

    return { lat: centerLat, lng: centerLng, zoom };
  }, [routeVenueIds]);

  // Build markers query parameter
  const markersParam = useMemo(() => {
    const markers: string[] = [];

    routeVenueIds.forEach((venueId, index) => {
      const venue = verifiedVenueMap.get(venueId);
      if (!venue) return;

      // Color code: red for route start, orange for middle, green for end
      let color = "orange";
      if (index === 0) color = "red";
      if (index === routeVenueIds.length - 1) color = "green";

      const markerLabel = `${index + 1}`;
      const markerSpec = `color:${color}|label:${markerLabel}|${venue.lat},${venue.lng}`;
      markers.push(markerSpec);
    });

    return markers.length > 0 ? `&markers=${markers.join("&markers=")}` : "";
  }, [routeVenueIds]);

  // Build path for route (if applicable)
  const pathParam = useMemo(() => {
    if (!routeLegs || routeLegs.length === 0) return "";

    const pathPoints = routeLegs
      .flatMap((leg) => {
        if (leg.geometry && leg.geometry.length > 1) {
          return leg.geometry.map(([lat, lng]) => `${lat},${lng}`);
        }

        const fromVenue = verifiedVenueMap.get(leg.set.venueId || "");
        const toVenue = leg.nextSet
          ? verifiedVenueMap.get(leg.nextSet.venueId || "")
          : undefined;

        if (!fromVenue) {
          return [];
        }

        if (!toVenue) {
          return [`${fromVenue.lat},${fromVenue.lng}`];
        }

        return [
          `${fromVenue.lat},${fromVenue.lng}`,
          `${toVenue.lat},${toVenue.lng}`,
        ];
      })
      .filter((point, index, list) => point && point !== list[index - 1]);

    return pathPoints.length > 1 ? `&path=color:0x0ea5e9ff|weight:3|${pathPoints.join("|")}` : "";
  }, [routeLegs]);

  // Build Google Static Maps URL
  const mapUrl = useMemo(() => {
    // Note: This uses Google Static Maps API
    // For production, you'll need to set up a backend proxy or use Maps Embed API
    const baseUrl = "https://maps.googleapis.com/maps/api/staticmap";
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const params = new URLSearchParams({
      center: `${mapCenter.lat},${mapCenter.lng}`,
      zoom: String(mapCenter.zoom),
      size: "600x400",
      maptype: "roadmap",
      key: apiKey,
    });

    // Add multiple style parameters
    const styles = [
      "feature:all|element:labels|visibility:off",
      "feature:water|color:0xb3d9ff",
      "feature:land|color:0xf3f3f3",
      "feature:road|visibility:off",
      "feature:administrative|element:geometry.stroke|color:0xcccccc",
    ];

    styles.forEach((style) => {
      params.append("style", style);
    });

    return `${baseUrl}?${params.toString()}${markersParam}${pathParam}`;
  }, [mapCenter, markersParam, pathParam]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((s) => s.id)),
    [favorites]
  );

  return (
    <div className={`flex flex-col h-full w-full bg-zinc-900 ${className}`}>
      {/* Map Display */}
      <div className="flex-1 bg-zinc-800 relative overflow-hidden">
        {routeVenueIds.length > 0 ? (
          <>
            {/* Static map image */}
            <Image
              src={mapUrl}
              alt="SYNCHRONICITY Route Map"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover"
            />

            {/* Route info overlay */}
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur px-3 py-2 rounded-lg text-xs text-zinc-300">
              <div className="font-semibold text-cyan-400">
                {routeVenueIds.length} {t("map.venues")}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t("map.noVenues")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Venue List */}
      {routeVenueIds.length > 0 && (
        <div className="bg-[#0a0a0a] border-t border-zinc-800 max-h-[40%] overflow-y-auto">
          <div className="p-3 space-y-2">
            {routeVenueIds.map((venueId, index) => {
              const venue = verifiedVenueMap.get(venueId);
              if (!venue) return null;

              const venueDay = daySets
                ? daySets
                    .filter((s) => s.venueId === venueId)
                    .sort((a, b) => a.startAt - b.startAt)
                : sortedFavorites.filter((s) => s.venueId === venueId);

              return (
                <div
                  key={venueId}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: venue.color }}
                        >
                          {index + 1}
                        </div>
                        <div className="font-semibold text-sm text-zinc-100">
                          {venue.name}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 ml-8">
                        {venue.area === "A"
                          ? t("timetable.areaA")
                          : venue.area === "B"
                          ? t("timetable.areaB")
                          : t("timetable.areaOther")}
                      </div>
                    </div>
                  </div>

                  {/* Shows sets at this venue */}
                  {venueDay.length > 0 && (
                    <div className="mt-2 ml-8 space-y-1 border-t border-zinc-800/50 pt-2">
                      {venueDay.map((set) => {
                        const isFav = favoriteIds.has(set.id);
                        return (
                          <div key={set.id} className="text-xs">
                            <div
                              className={
                                isFav
                                  ? "font-semibold text-cyan-300"
                                  : "font-medium text-zinc-300"
                              }
                            >
                              {set.artistName}
                              {isFav && (
                                <span className="ml-1 text-[10px] text-cyan-400">
                                  ★
                                </span>
                              )}
                            </div>
                            <div className="text-zinc-500">
                              {formatTime(set.startAt)} -{" "}
                              {formatTime(set.finishAt)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
