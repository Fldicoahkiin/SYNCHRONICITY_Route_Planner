export type WalkMinutes = number;

// prettier-ignore
export const walkingMatrix: Record<string, Record<string, WalkMinutes>> = {
  "o-east": {
    "o-east": 0, "duo": 1, "clubasia": 3, "o-nest": 2, "o-west": 2, "7thfloor": 1,
    "quattro": 12, "veats": 12, "www": 14, "wwwx": 14, "tokio-tokyo": 15, "fows": 13,
  },
  "duo": {
    "o-east": 1, "duo": 0, "clubasia": 2, "o-nest": 1, "o-west": 1, "7thfloor": 1,
    "quattro": 12, "veats": 12, "www": 14, "wwwx": 14, "tokio-tokyo": 15, "fows": 13,
  },
  "clubasia": {
    "o-east": 3, "duo": 2, "clubasia": 0, "o-nest": 2, "o-west": 2, "7thfloor": 2,
    "quattro": 11, "veats": 11, "www": 13, "wwwx": 13, "tokio-tokyo": 14, "fows": 12,
  },
  "o-nest": {
    "o-east": 2, "duo": 1, "clubasia": 2, "o-nest": 0, "o-west": 1, "7thfloor": 1,
    "quattro": 12, "veats": 12, "www": 14, "wwwx": 14, "tokio-tokyo": 15, "fows": 13,
  },
  "o-west": {
    "o-east": 2, "duo": 1, "clubasia": 2, "o-nest": 1, "o-west": 0, "7thfloor": 1,
    "quattro": 12, "veats": 12, "www": 14, "wwwx": 14, "tokio-tokyo": 15, "fows": 13,
  },
  "7thfloor": {
    "o-east": 1, "duo": 1, "clubasia": 2, "o-nest": 1, "o-west": 1, "7thfloor": 0,
    "quattro": 12, "veats": 12, "www": 14, "wwwx": 14, "tokio-tokyo": 15, "fows": 13,
  },
  "quattro": {
    "o-east": 12, "duo": 12, "clubasia": 11, "o-nest": 12, "o-west": 12, "7thfloor": 12,
    "quattro": 0, "veats": 2, "www": 4, "wwwx": 4, "tokio-tokyo": 6, "fows": 3,
  },
  "veats": {
    "o-east": 12, "duo": 12, "clubasia": 11, "o-nest": 12, "o-west": 12, "7thfloor": 12,
    "quattro": 2, "veats": 0, "www": 4, "wwwx": 3, "tokio-tokyo": 5, "fows": 2,
  },
  "www": {
    "o-east": 14, "duo": 14, "clubasia": 13, "o-nest": 14, "o-west": 14, "7thfloor": 14,
    "quattro": 4, "veats": 4, "www": 0, "wwwx": 1, "tokio-tokyo": 3, "fows": 3,
  },
  "wwwx": {
    "o-east": 14, "duo": 14, "clubasia": 13, "o-nest": 14, "o-west": 14, "7thfloor": 14,
    "quattro": 4, "veats": 3, "www": 1, "wwwx": 0, "tokio-tokyo": 3, "fows": 3,
  },
  "tokio-tokyo": {
    "o-east": 15, "duo": 15, "clubasia": 14, "o-nest": 15, "o-west": 15, "7thfloor": 15,
    "quattro": 6, "veats": 5, "www": 3, "wwwx": 3, "tokio-tokyo": 0, "fows": 4,
  },
  "fows": {
    "o-east": 13, "duo": 13, "clubasia": 12, "o-nest": 13, "o-west": 13, "7thfloor": 13,
    "quattro": 3, "veats": 2, "www": 3, "wwwx": 3, "tokio-tokyo": 4, "fows": 0,
  },
};

export function getWalkMinutes(fromVenueId: string, toVenueId: string): WalkMinutes {
  return walkingMatrix[fromVenueId]?.[toVenueId] ?? walkingMatrix["o-east"]["quattro"];
}
