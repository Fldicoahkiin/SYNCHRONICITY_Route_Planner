export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

export function findBestMatch(
  text: string,
  candidates: string[],
  thresholdRatio = 0.3
): { candidate: string; distance: number } | null {
  if (candidates.length === 0) return null;
  let best: { candidate: string; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = levenshteinDistance(text, candidate.toLowerCase());
    const maxLen = Math.max(text.length, candidate.length);
    if (distance / maxLen <= thresholdRatio) {
      if (!best || distance < best.distance) {
        best = { candidate, distance };
      }
    }
  }
  return best;
}
