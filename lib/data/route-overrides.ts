export interface RouteCalibration {
  /**
   * Intermediate waypoints to force the route through specific intersections.
   * Format is an array of [longitude, latitude] coordinates.
   */
  via?: [number, number][];
}

/**
 * A mapping of "fromVenueId->toVenueId" exactly matching the output of getVenuePairKey().
 * If a route between two venues is calculating sub-optimally from the public routing API,
 * you can specify waypoints here. When the `pnpm run update-routes` script runs, it will
 * inject these coordinates to force the routing engine onto the correct path.
 */
export const routeOverrides: Record<string, RouteCalibration> = {
  // Example calibration:
  // "o-east->wwwx": {
  //   via: [
  //     [139.697525, 35.659928]
  //   ]
  // }
};
