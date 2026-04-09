import type { Worker } from "tesseract.js";
import { timetable, type TimetableSet } from "@/lib/data/timetable";
import { levenshteinDistance } from "./fuzzy-match";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StageHint {
  stageName: string;
  confidence: number;
}

interface RecognizedRegion {
  text: string;
  region: Rect;
  timeHint: number | null;
  stageHint: StageHint | null;
}

interface RankedSetCandidate {
  set: TimetableSet;
  score: number;
}

interface OCRProgressState {
  completedJobs: number;
  totalJobs: number;
}

interface PreparedArtistSearchText {
  normalized: string;
  compact: string;
  phrases: string[];
}

const REGION_PROFILES = [
  { minSaturation: 0.42, minLuma: 0.34, minChannel: 60 },
  { minSaturation: 0.38, minLuma: 0.34, minChannel: 60 },
  { minSaturation: 0.34, minLuma: 0.34, minChannel: 60 },
  { minSaturation: 0.34, minLuma: 0.28, minChannel: 60 },
  { minSaturation: 0.25, minLuma: 0.18, minChannel: 50 },
  { minSaturation: 0.15, minLuma: 0.10, minChannel: 40 },
  { minSaturation: 0.08, minLuma: 0.08, minChannel: 30 },
  { minSaturation: 0.02, minLuma: 0.05, minChannel: 20 },
  { minSaturation: 0.00, minLuma: 0.04, minChannel: 15 },
];
const MAX_REGION_COUNT = 150;
const REGION_PADDING = 8;
const REGION_TARGET_WIDTH = 920;
const TIME_HINT_WINDOW_MINUTES = 20;
const ESTIMATED_TIME_WINDOW_MINUTES = 24;
const CONFIDENT_MATCH_SCORE = 65;
const CONFIDENT_MATCH_GAP = 8;
const REGION_MERGE_OVERLAP_RATIO = 0.18;
const TOKYO_TIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

const STAGE_ALIAS_OVERRIDES: Record<string, string[]> = {
  "7thFLOOOR": ["7thfloor", "7thflooor"],
  "O-EAST": ["oeast", "oeas"],
  "O-EAST 2nd Stage": ["oeast2ndstage", "oeast2nd", "2ndstage"],
  "O-EAST 3F LOBBY": ["oeast3flobby", "3flobby", "lobby"],
  "O-WEST": ["owest", "owes"],
  "O-nest": ["onest", "ones"],
  "SHIBUYA CLUB QUATTRO": ["shibuyaclubquattro", "quattro"],
  "SHIBUYA FOWS": ["shibuyafows", "fows"],
  "TOKIO TOKYO": ["tokiotokyo"],
  "Veats Shibuya": ["veatsshibuya", "veats"],
  WWW: ["www"],
  WWWX: ["wwwx"],
  clubasia: ["clubasia"],
  "duo MUSIC EXCHANGE": ["duomusicexchange", "duomusic", "musicexchange"],
};

const ARTIST_ALIAS_OVERRIDES: Record<string, string[]> = {
  kurayamisaka: ["kurayamisa ka", "kurayamisa"],
  "mudy on the 昨晩": ["mudy on the sakuban", "muddy on the sakuban", "muddy on the"],
  "サニーデイ・サービス": ["Sunny Day Service", "sunnydayservice"],
  "渋さ知らズオーケストラ": [
    "Shibusashirazu-Orchestra",
    "Shibusashirazu Orchestra",
    "shibusashirazu",
  ],
  "揺れるは幽霊": ["yureruwayurei", "yureruwayureru", "yureruwayurel"],
  "神聖かまってちゃん": ["Shinsei Kamattechan", "shinseikamattechan"],
  ひとひら: ["hitohira"],
  雪国: ["Yukiguni"],
  "水中スピカ": ["Suichu Spica", "suichuspica"],
  "歌うこと、つくること、続けていくこと さらさ×エバンズ亜莉沙": ["sarasa", "Evans Arisa", "sarasaevans"],
  "MONO NO AWARE": ["monoaware", "mono no aware"],
  "Mega Shinnosuke": ["megashinnosuke", "mega shinnosuk"],
  "Ko Umehara": ["koumehara", "ko umehara"],
  "ハク。": ["haku"],
  "Jeremy Quartus": ["jeremyquartus"],
  "NIKO NIKO TAN TAN": ["nikonikotan", "nikonikotantan"],
  chilldspot: ["chilldspot"],
  "fox capture plan": ["foxcaptureplan"],
  "The Novembers": ["thenovembers"],
  JYOCHO: ["jyocho"],
  "world's end girlfriend": ["worlds end girlfriend", "worldsendgirlfriend"],
  "Blume popo": ["blumepopo", "blume popo"],
  tricot: ["tricot"],
  "No Buses": ["nobuses"],
  PEDRO: ["pedro"],
  lüv: ["luv"],
  Homecomings: ["homecomings", "homecom"],
  ヒトリエ: ["hitorie"],
};

// Import the dynamically fetched API data to augment the overrides with Romaji
import allArtistsData from "@/data/2026/all-artists.json";

function extractRomajiAliases(phoneticName: string | null): string[] {
  if (!phoneticName) return [];
  // Match contiguous ASCII letters, numbers, and basic punctuation
  // e.g., "Yanushiやぬし" -> "Yanushi", "fox capture planふぉっくす..." -> "fox capture plan"
  const matches = phoneticName.match(/[A-Za-z0-9\s.\-]+/g) ?? [];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 2); // Ignore single characters or stray spaces
}

for (const node of allArtistsData.data) {
  const name = node.attributes?.name;
  const phonetic = node.attributes?.phonetic_name;
  if (name && phonetic) {
    const romajiAliases = extractRomajiAliases(phonetic);
    if (romajiAliases.length > 0) {
      if (!ARTIST_ALIAS_OVERRIDES[name]) {
        ARTIST_ALIAS_OVERRIDES[name] = [];
      }
      ARTIST_ALIAS_OVERRIDES[name].push(...romajiAliases);
    }
  }
}

const artistNames = Array.from(new Set(timetable.map((set) => set.artistName)));
const normalizedArtistNameMap = new Map(
  artistNames.map((name) => [normalizeMatchText(name), name]),
);
const artistCandidates = artistNames.map((name) => {
  const aliases = Array.from(
    new Set([name, ...(ARTIST_ALIAS_OVERRIDES[name] ?? [])]),
  );
  const normalized = normalizeMatchText(name);
  const normalizedAliases = aliases
    .map(normalizeMatchText)
    .filter(Boolean)
    .filter((alias) => {
      const actualArtist = normalizedArtistNameMap.get(alias);
      return !actualArtist || actualArtist === name;
    })
    .sort((left, right) => right.length - left.length);

  return {
    name,
    normalized,
    compact: normalized.replace(/\s+/g, ""),
    normalizedAliases,
    compactAliases: normalizedAliases.map((alias) => alias.replace(/\s+/g, "")),
  };
});
const artistCandidateMap = new Map(
  artistCandidates.map((candidate) => [candidate.name, candidate]),
);
const stageCandidates = Array.from(new Set(timetable.map((set) => set.stageName)))
  .map((stageName) => {
    const aliases = new Set<string>([stageName]);
    for (const alias of STAGE_ALIAS_OVERRIDES[stageName] ?? []) {
      aliases.add(alias);
    }

    const normalizedAliases = Array.from(aliases)
      .map(normalizeMatchText)
      .filter(Boolean);

    return {
      stageName,
      aliases: normalizedAliases.map((alias) => alias.replace(/\s+/g, "")),
      normalizedAliases,
    };
  })
  .sort((left, right) => {
    const leftLength = Math.max(...left.aliases.map((alias) => alias.length));
    const rightLength = Math.max(...right.aliases.map((alias) => alias.length));
    return rightLength - leftLength;
  });
const setStartMinutes = new Map(
  timetable.map((set) => [set.id, getSetStartMinutes(set.startAt)]),
);

export interface MatchResult {
  artistName: string;
  sets: typeof timetable;
  rawLine: string;
}

export interface OCRResult {
  text: string;
  day: 1 | 2 | null;
  matches: MatchResult[];
}

function normalizeMatchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[＆&]/g, " and ")
    .replace(/[‘’'`´]/g, "")
    .replace(/[“”\"]/g, "")
    .replace(/[()［］\[\]{}]/g, " ")
    .replace(/[・/\\|:_.,!?-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeLine(line: string): string {
  return line
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeBlockText(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(sanitizeLine)
    .filter(Boolean)
    .join("\n");
}

function buildSearchPhrases(normalizedText: string): string[] {
  const tokens = normalizedText.split(" ").filter(Boolean);
  const phrases = new Set<string>();

  if (normalizedText) {
    phrases.add(normalizedText);
    phrases.add(normalizedText.replace(/\s+/g, ""));
  }

  for (let start = 0; start < tokens.length; start++) {
    for (let length = 1; length <= 4 && start + length <= tokens.length; length++) {
      const phrase = tokens.slice(start, start + length).join(" ");
      phrases.add(phrase);
      phrases.add(phrase.replace(/\s+/g, ""));
    }
  }

  return Array.from(phrases).filter(Boolean);
}

function getSimilarity(left: string, right: string): number {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function getSetStartMinutes(startAt: number): number {
  const [hours, minutes] = TOKYO_TIME_FORMATTER.format(new Date(startAt * 1000))
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

function getTimeHint(text: string): number | null {
  const match = text.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function buildTimeEstimator(
  regions: RecognizedRegion[],
): ((y: number) => number | null) | null {
  const samples = regions
    .filter((region) => region.timeHint !== null)
    .map((region) => ({ x: region.region.y, y: region.timeHint! }));

  if (samples.length < 2) {
    return null;
  }

  const meanX = samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length;
  const meanY = samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length;
  const variance = samples.reduce(
    (sum, sample) => sum + (sample.x - meanX) * (sample.x - meanX),
    0,
  );

  if (variance === 0) {
    return null;
  }

  const covariance = samples.reduce(
    (sum, sample) => sum + (sample.x - meanX) * (sample.y - meanY),
    0,
  );
  const slope = covariance / variance;

  if (!Number.isFinite(slope) || slope <= 0.1 || slope >= 1) {
    return null;
  }

  const intercept = meanY - slope * meanX;

  return (y: number) => {
    const estimated = intercept + slope * y;
    if (!Number.isFinite(estimated) || estimated < 0 || estimated > 24 * 60) {
      return null;
    }
    return roundToNearest(estimated, 5);
  };
}

function findStageHint(text: string): StageHint | null {
  const normalized = normalizeMatchText(text);
  const compact = normalized.replace(/\s+/g, "");
  const phrases = buildSearchPhrases(normalized);

  let best: StageHint | null = null;

  for (const candidate of stageCandidates) {
    let confidence = 0;

    for (const alias of candidate.aliases) {
      if (compact.includes(alias)) {
        confidence = Math.max(confidence, Math.min(1, 0.92 + alias.length / 100));
        continue;
      }

      for (const phrase of phrases) {
        const compactPhrase = phrase.replace(/\s+/g, "");
        if (compactPhrase.length < 3) {
          continue;
        }
        confidence = Math.max(confidence, getSimilarity(compactPhrase, alias));
      }
    }

    if (!best || confidence > best.confidence) {
      best = { stageName: candidate.stageName, confidence };
    }
  }

  return best && best.confidence >= 0.72 ? best : null;
}

function removeTimeAndStage(text: string, stageHint: StageHint | null): string {
  let normalized = normalizeMatchText(text).replace(/\b\d{1,2}\s+\d{2}\b/g, " ");

  if (stageHint) {
    const stage = stageCandidates.find(
      (candidate) => candidate.stageName === stageHint.stageName,
    );
    for (const alias of stage?.normalizedAliases ?? []) {
      normalized = normalized.replace(alias, " ");
    }
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function prepareArtistSearchText(
  text: string,
  stageHint: StageHint | null,
): PreparedArtistSearchText | null {
  const normalized = removeTimeAndStage(text, stageHint);
  if (!normalized) {
    return null;
  }

  return {
    normalized,
    compact: normalized.replace(/\s+/g, ""),
    phrases: buildSearchPhrases(normalized),
  };
}

function getArtistSimilarity(
  searchText: PreparedArtistSearchText | null,
  artistName: string,
): number {
  const artist = artistCandidateMap.get(artistName);

  if (!artist || !searchText) {
    return 0;
  }

  let best = 0;
  for (let index = 0; index < artist.normalizedAliases.length; index++) {
    const alias = artist.normalizedAliases[index];
    const compactAlias = artist.compactAliases[index];

    if (
      searchText.normalized === alias ||
      searchText.compact === compactAlias ||
      searchText.normalized.includes(alias) ||
      searchText.compact.includes(compactAlias)
    ) {
      return 1;
    }

    for (const phrase of searchText.phrases) {
      const compactPhrase = phrase.replace(/\s+/g, "");
      if (compactPhrase.length < Math.min(4, compactAlias.length)) {
        continue;
      }
      best = Math.max(best, getSimilarity(compactPhrase, compactAlias));
    }
  }

  return best >= 0.45 ? best : 0;
}

function filterSetsForDay(
  sets: TimetableSet[],
  preferredDay: 1 | 2 | null,
): TimetableSet[] {
  if (preferredDay === null) {
    return sets;
  }

  return sets.filter((set) => set.day === preferredDay);
}

function rankSetCandidates(
  region: RecognizedRegion,
  preferredDay: 1 | 2 | null,
  estimatedTimeHint: number | null,
): RankedSetCandidate[] {
  const stageHint = region.stageHint;
  const preparedArtistText = prepareArtistSearchText(region.text, stageHint);
  const timeHint = region.timeHint ?? estimatedTimeHint;
  const hasParsedTime = region.timeHint !== null;
  const timeWindow = hasParsedTime
    ? TIME_HINT_WINDOW_MINUTES
    : ESTIMATED_TIME_WINDOW_MINUTES;
  const timeWeight = hasParsedTime ? 35 : estimatedTimeHint !== null ? 24 : 0;

  return timetable
    .map((set) => {
      let score = 0;

      if (preferredDay !== null) {
        score += set.day === preferredDay ? 40 : -40;
      }

      if (stageHint) {
        if (set.stageName === stageHint.stageName) {
          score += 55 * stageHint.confidence;
        } else if (stageHint.confidence >= 0.9) {
          score -= 30;
        }
      }

      if (timeHint !== null) {
        const diff = Math.abs((setStartMinutes.get(set.id) ?? 0) - timeHint);
        if (diff <= timeWindow) {
          score += Math.max(0, timeWeight - diff * (hasParsedTime ? 1.75 : 1.1));
        } else {
          score -= hasParsedTime ? 18 : 10;
        }

        if (stageHint && set.stageName === stageHint.stageName && diff <= 8) {
          score += 20;
        }
      }

      const artistSimilarity = getArtistSimilarity(
        preparedArtistText,
        set.artistName,
      );
      score += artistSimilarity * 60;

      // Boost exact matches heavily so they bypass minimum threshold even without stage/time hints
      if (artistSimilarity >= 0.98) {
        score += 100;
      } else if (artistSimilarity >= 0.85) {
        score += 40;
      }

      if (artistSimilarity >= 0.92 && stageHint && set.stageName === stageHint.stageName) {
        score += 15;
      }

      return { set, score };
    })
    .sort((left, right) => right.score - left.score);
}

function hasConfidentWinner(candidates: RankedSetCandidate[]): boolean {
  const [top, second] = candidates;
  if (!top || top.score < CONFIDENT_MATCH_SCORE) {
    return false;
  }

  if (!second) {
    return true;
  }

  return top.score - second.score >= CONFIDENT_MATCH_GAP || top.score >= 118;
}

function inferDayFromRegions(regions: RecognizedRegion[]): 1 | 2 | null {
  const votes = new Map<1 | 2, number>([
    [1, 0],
    [2, 0],
  ]);

  for (const region of regions) {
    const ranked = rankSetCandidates(region, null, null);
    if (!hasConfidentWinner(ranked)) {
      continue;
    }

    const top = ranked[0];
    votes.set(top.set.day, (votes.get(top.set.day) ?? 0) + 1);
  }

  const day1Votes = votes.get(1) ?? 0;
  const day2Votes = votes.get(2) ?? 0;

  if (day1Votes === 0 && day2Votes === 0) {
    return null;
  }

  if (day1Votes === day2Votes) {
    return null;
  }

  return day1Votes > day2Votes ? 1 : 2;
}

function pickMatchedSets(
  regions: RecognizedRegion[],
  preferredDay: 1 | 2 | null,
): TimetableSet[] {
  const estimateTime = buildTimeEstimator(regions);
  const matched = new Map<string, TimetableSet>();

  for (const region of regions) {
    const estimatedTime =
      region.timeHint === null ? estimateTime?.(region.region.y) ?? null : null;
    const ranked = rankSetCandidates(region, preferredDay, estimatedTime);

    if (!hasConfidentWinner(ranked)) {
      continue;
    }

    const top = ranked[0].set;
    matched.set(top.id, top);
  }

  return Array.from(matched.values()).sort((left, right) => left.startAt - right.startAt);
}

function extractStructuredSetMatches(
  regions: RecognizedRegion[],
  preferredDay: 1 | 2 | null,
): TimetableSet[] {
  const matched = new Map<string, TimetableSet>();

  for (const region of regions) {
    const lines = region.text
      .split("\n")
      .map(sanitizeLine)
      .filter(Boolean);

    for (let index = 0; index < lines.length; index++) {
      const timeHint = getTimeHint(lines[index]);
      const stageHint = findStageHint(lines[index]);

      if (timeHint === null || !stageHint) {
        continue;
      }

      const contextText = lines.slice(index, index + 4).join("\n");
      const ranked = rankSetCandidates(
        {
          text: contextText,
          region: region.region,
          timeHint,
          stageHint,
        },
        preferredDay,
        null,
      );

      if (!hasConfidentWinner(ranked)) {
        continue;
      }

      matched.set(ranked[0].set.id, ranked[0].set);
    }
  }

  return Array.from(matched.values()).sort((left, right) => left.startAt - right.startAt);
}

function extractRegionDirectMatches(
  regions: RecognizedRegion[],
  preferredDay: 1 | 2 | null,
): MatchResult[] {
  const matched = new Map<string, MatchResult>();

  for (const region of regions) {
    const lineMatches = extractMatches(region.text);
    if (lineMatches.length === 0) {
      continue;
    }

    for (const match of lineMatches) {
      matched.set(match.artistName, {
        artistName: match.artistName,
        sets: filterSetsForDay(match.sets, preferredDay),
        rawLine: match.rawLine,
      });
    }
  }

  return Array.from(matched.values()).filter((match) => match.sets.length > 0);
}

export function detectDay(text: string): 1 | 2 | null {
  const normalized = normalizeMatchText(text);

  if (/(\bday\s*1\b|\b4\s*11\b|\bapr(?:il)?\s*11\b|\bsat\b)/.test(normalized)) {
    return 1;
  }

  if (/(\bday\s*2\b|\b4\s*12\b|\bapr(?:il)?\s*12\b|\bsun\b)/.test(normalized)) {
    return 2;
  }

  return null;
}

export function extractMatches(ocrText: string): MatchResult[] {
  const lines = ocrText
    .split("\n")
    .map(sanitizeLine)
    .filter((line) => line.length >= 2);

  const matched = new Map<string, MatchResult>();

  for (let i = 0; i < lines.length; i++) {
    for (let len = 1; len <= 3 && i + len <= lines.length; len++) {
      const line = lines.slice(i, i + len).join(" ");
      
      const normalizedLine = normalizeMatchText(line);
      if (!normalizedLine) {
        continue;
      }

      const compactLine = normalizedLine.replace(/\s+/g, "");
      const looksLikeMetadata =
        /^\d{1,2}[:.]\d{2}/.test(line) ||
        /^[A-Z\s]+$/.test(line) ||
        compactLine.length <= 2;

      const preparedSearchText = prepareArtistSearchText(line, findStageHint(line));
      const rankedArtists = artistCandidates
        .map((candidate) => ({
          candidate,
          score: getArtistSimilarity(preparedSearchText, candidate.name),
        }))
        .filter((item) => item.score >= (looksLikeMetadata ? 0.96 : 0.82))
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }

          return right.candidate.compact.length - left.candidate.compact.length;
        });

      const top = rankedArtists[0];
      const second = rankedArtists[1];
      const hasClearWinner =
        !!top &&
        (!second || top.score - second.score >= 0.08 || top.score >= 0.96);

      if (hasClearWinner && top && !matched.has(top.candidate.name)) {
        const sets = timetable.filter((set) => set.artistName === top.candidate.name);
        if (sets.length > 0) {
          matched.set(top.candidate.name, {
            artistName: top.candidate.name,
            sets,
            rawLine: line,
          });
        }
      }
    }
  }

  return Array.from(matched.values());
}

function loadImageElement(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = imageUrl;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function buildRegionMask(
  image: HTMLImageElement,
  region: Rect,
  profile: { minSaturation: number; minLuma: number; minChannel: number },
): { mask: Uint8Array; width: number; height: number } | null {
  const maxSampleSide = 280;
  const scale = Math.min(
    1,
    maxSampleSide / Math.max(region.width, region.height),
  );
  const sampleWidth = Math.max(1, Math.round(region.width * scale));
  const sampleHeight = Math.max(1, Math.round(region.height * scale));
  const canvas = createCanvas(sampleWidth, sampleHeight);
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    sampleWidth,
    sampleHeight,
  );

  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const mask = new Uint8Array(sampleWidth * sampleHeight);

  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const offset = (y * sampleWidth + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const saturation = max === 0 ? 0 : (max - min) / max;

      if (
        saturation > profile.minSaturation &&
        luma > profile.minLuma &&
        max > profile.minChannel
      ) {
        mask[y * sampleWidth + x] = 1;
      }
    }
  }

  return { mask, width: sampleWidth, height: sampleHeight };
}

function findBestGap(
  mask: Uint8Array,
  width: number,
  height: number,
  axis: "x" | "y",
): { start: number; end: number } | null {
  const length = axis === "x" ? width : height;
  const otherLength = axis === "x" ? height : width;
  const edgePadding = Math.max(2, Math.round(length * 0.12));
  const minGapLength = Math.max(2, Math.round(length * 0.025));
  const maxDensity = 0.035;

  let best: { start: number; end: number } | null = null;
  let currentStart = -1;

  for (let index = 0; index < length; index++) {
    let count = 0;

    if (axis === "x") {
      for (let y = 0; y < height; y++) {
        count += mask[y * width + index];
      }
    } else {
      for (let x = 0; x < width; x++) {
        count += mask[index * width + x];
      }
    }

    const density = count / otherLength;
    const isGap =
      density <= maxDensity &&
      index >= edgePadding &&
      index <= length - edgePadding;

    if (isGap && currentStart === -1) {
      currentStart = index;
    } else if (!isGap && currentStart !== -1) {
      if (index - currentStart >= minGapLength) {
        if (!best || index - currentStart > best.end - best.start) {
          best = { start: currentStart, end: index - 1 };
        }
      }
      currentStart = -1;
    }
  }

  if (currentStart !== -1 && length - currentStart >= minGapLength) {
    const candidate = { start: currentStart, end: length - 1 };
    if (!best || candidate.end - candidate.start > best.end - best.start) {
      best = candidate;
    }
  }

  return best;
}

function splitRegionByGaps(
  image: HTMLImageElement,
  region: Rect,
  profile: { minSaturation: number; minLuma: number; minChannel: number },
  depth = 0,
): Rect[] {
  if (depth >= 4 || region.width < 120 || region.height < 120) {
    return [region];
  }

  const regionMask = buildRegionMask(image, region, profile);
  if (!regionMask) {
    return [region];
  }

  const verticalGap = findBestGap(
    regionMask.mask,
    regionMask.width,
    regionMask.height,
    "x",
  );
  const horizontalGap = findBestGap(
    regionMask.mask,
    regionMask.width,
    regionMask.height,
    "y",
  );

  const verticalGapSize = verticalGap ? verticalGap.end - verticalGap.start + 1 : 0;
  const horizontalGapSize = horizontalGap
    ? horizontalGap.end - horizontalGap.start + 1
    : 0;

  let splitAxis: "x" | "y" | null = null;
  if (
    horizontalGap &&
    (!verticalGap ||
      horizontalGapSize / regionMask.height >= verticalGapSize / regionMask.width)
  ) {
    splitAxis = "y";
  } else if (verticalGap) {
    splitAxis = "x";
  }

  if (!splitAxis) {
    return [region];
  }

  if (splitAxis === "x") {
    const gap = verticalGap!;
    const splitX =
      region.x +
      Math.round((((gap.start + gap.end) / 2) * region.width) / regionMask.width);
    const leftWidth = splitX - region.x;
    const rightWidth = region.x + region.width - splitX;

    if (leftWidth < 60 || rightWidth < 60) {
      return [region];
    }

    return [
      ...splitRegionByGaps(
        image,
        { x: region.x, y: region.y, width: leftWidth, height: region.height },
        profile,
        depth + 1,
      ),
      ...splitRegionByGaps(
        image,
        { x: splitX, y: region.y, width: rightWidth, height: region.height },
        profile,
        depth + 1,
      ),
    ];
  }

  const gap = horizontalGap!;
  const splitY =
    region.y +
    Math.round((((gap.start + gap.end) / 2) * region.height) / regionMask.height);
  const topHeight = splitY - region.y;
  const bottomHeight = region.y + region.height - splitY;

  if (topHeight < 60 || bottomHeight < 60) {
    return [region];
  }

  return [
    ...splitRegionByGaps(
      image,
      { x: region.x, y: region.y, width: region.width, height: topHeight },
      profile,
      depth + 1,
    ),
    ...splitRegionByGaps(
      image,
      { x: region.x, y: splitY, width: region.width, height: bottomHeight },
      profile,
      depth + 1,
    ),
  ];
}

function overlapsOrTouches(left: Rect, right: Rect, gap = 0): boolean {
  return !(
    left.x + left.width + gap < right.x ||
    right.x + right.width + gap < left.x ||
    left.y + left.height + gap < right.y ||
    right.y + right.height + gap < left.y
  );
}

function getOverlapArea(left: Rect, right: Rect): number {
  const overlapWidth =
    Math.min(left.x + left.width, right.x + right.width) -
    Math.max(left.x, right.x);
  const overlapHeight =
    Math.min(left.y + left.height, right.y + right.height) -
    Math.max(left.y, right.y);

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return 0;
  }

  return overlapWidth * overlapHeight;
}

function mergeNearbyRegions(regions: Rect[], gap = 0): Rect[] {
  const merged: Rect[] = [];

  for (const region of regions) {
    const target = merged.find((item) => {
      if (!overlapsOrTouches(item, region, gap)) {
        return false;
      }

      const overlapArea = getOverlapArea(item, region);
      if (overlapArea === 0) {
        return false;
      }

      const smallerArea = Math.min(
        item.width * item.height,
        region.width * region.height,
      );

      return overlapArea / smallerArea >= REGION_MERGE_OVERLAP_RATIO;
    });

    if (!target) {
      merged.push({ ...region });
      continue;
    }

    const right = Math.max(target.x + target.width, region.x + region.width);
    const bottom = Math.max(target.y + target.height, region.y + region.height);
    target.x = Math.min(target.x, region.x);
    target.y = Math.min(target.y, region.y);
    target.width = right - target.x;
    target.height = bottom - target.y;
  }

  return merged.sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y,
  );
}

function detectRegionsWithProfile(
  image: HTMLImageElement,
  profile: { minSaturation: number; minLuma: number; minChannel: number },
): Rect[] {
  const sampleWidth = Math.min(320, image.naturalWidth);
  const sampleHeight = Math.max(
    1,
    Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth),
  );
  const canvas = createCanvas(sampleWidth, sampleHeight);
  const context = canvas.getContext("2d");

  if (!context) {
    return [];
  }

  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const mask = new Uint8Array(sampleWidth * sampleHeight);
  const visited = new Uint8Array(sampleWidth * sampleHeight);
  const headerCutoff = 0;
  const regions: Rect[] = [];
  const neighbors = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      if (y < headerCutoff) {
        continue;
      }

      const offset = (y * sampleWidth + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const saturation = max === 0 ? 0 : (max - min) / max;

      if (
        saturation > profile.minSaturation &&
        luma > profile.minLuma &&
        max > profile.minChannel
      ) {
        mask[y * sampleWidth + x] = 1;
      }
    }
  }

  for (let index = 0; index < mask.length; index++) {
    if (!mask[index] || visited[index]) {
      continue;
    }

    const queue = [index];
    visited[index] = 1;

    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = 0;
    let maxY = 0;
    let area = 0;

    while (queue.length > 0) {
      const current = queue.pop()!;
      const x = current % sampleWidth;
      const y = Math.floor(current / sampleWidth);

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      area++;

      for (const [dx, dy] of neighbors) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (
          nextX < 0 ||
          nextX >= sampleWidth ||
          nextY < 0 ||
          nextY >= sampleHeight
        ) {
          continue;
        }

        const nextIndex = nextY * sampleWidth + nextX;
        if (!mask[nextIndex] || visited[nextIndex]) {
          continue;
        }

        visited[nextIndex] = 1;
        queue.push(nextIndex);
      }
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    if (area < 40 || width < 12 || height < 8) {
      continue;
    }

    const scaleX = image.naturalWidth / sampleWidth;
    const scaleY = image.naturalHeight / sampleHeight;
    const x = Math.max(0, Math.floor(minX * scaleX) - REGION_PADDING);
    const y = Math.max(0, Math.floor(minY * scaleY) - REGION_PADDING);
    const regionWidth = Math.min(
      image.naturalWidth - x,
      Math.ceil(width * scaleX) + REGION_PADDING * 2,
    );
    const regionHeight = Math.min(
      image.naturalHeight - y,
      Math.ceil(height * scaleY) + REGION_PADDING * 2,
    );

    const rawRegion = { x, y, width: regionWidth, height: regionHeight };
    regions.push(...splitRegionByGaps(image, rawRegion, profile));
  }

  return mergeNearbyRegions(regions, 0).slice(0, MAX_REGION_COUNT);
}

function detectSetRegions(image: HTMLImageElement): Rect[] {
  let fallback: Rect[] = [];
  const MIN_REGION_COUNT = 6;

  for (const profile of REGION_PROFILES) {
    const regions = detectRegionsWithProfile(image, profile);
    if (regions.length >= MIN_REGION_COUNT && regions.length <= MAX_REGION_COUNT) {
      return regions;
    }

    if (regions.length > fallback.length) {
      fallback = regions;
    }
  }

  return fallback;
}

function preprocessCrop(
  image: HTMLImageElement,
  region: Rect,
  targetWidth = REGION_TARGET_WIDTH,
): string {
  const scale = targetWidth / region.width;
  const canvas = createCanvas(targetWidth, region.height * scale);
  const context = canvas.getContext("2d");

  if (!context) {
    return image.src;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  // Extreme binarization for standard digital images with white text on colored blocks
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel is very bright (close to white). Official images have pure white #ffffff text
    if (r > 200 && g > 200 && b > 200) {
      // It's white text! Turn it entirely black for Tesseract
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      // It's background! Turn it entirely white to maximize contrast
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
    data[i + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function createOCRWorker(
  progressState: OCRProgressState,
  onProgress?: (progress: number) => void,
): Promise<Worker> {
  const logger = (message: { status: string; progress?: number }) => {
    if (
      message.status === "recognizing text" &&
      typeof message.progress === "number"
    ) {
      const progress =
        (progressState.completedJobs + message.progress) / progressState.totalJobs;
      onProgress?.(Math.min(0.99, progress));
    }
  };

  const { createWorker } = await import("tesseract.js");
  try {
    return await createWorker("eng+jpn", undefined, { logger });
  } catch {
    console.warn("Failed to load jpn traineddata, falling back to eng only.");
    return createWorker("eng", undefined, { logger });
  }
}

async function recognizeFullImage(
  worker: Worker,
  image: HTMLImageElement,
  progressState: OCRProgressState,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const scale = Math.min(1, REGION_TARGET_WIDTH / image.naturalWidth);
  const canvas = createCanvas(
    Math.round(image.naturalWidth * scale),
    Math.round(image.naturalHeight * scale),
  );
  const context = canvas.getContext("2d");
  if (!context) return "";

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  // Extreme binarization for standard digital images with white text on colored blocks
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Check if pixel is very bright (close to white). Official images have pure white text
    if (r > 200 && g > 200 && b > 200) {
      // Turn white text black for Tesseract
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      // Turn background pure white
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
    data[i + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  const {
    data: { text },
  } = await worker.recognize(dataUrl);
  progressState.completedJobs += 1;
  onProgress?.(Math.min(1, progressState.completedJobs / progressState.totalJobs));

  return sanitizeBlockText(text);
}

async function recognizeRegions(
  worker: Worker,
  image: HTMLImageElement,
  regions: Rect[],
  progressState: OCRProgressState,
  onProgress?: (progress: number) => void,
): Promise<RecognizedRegion[]> {
  const recognized: RecognizedRegion[] = [];

  for (const region of regions) {
    const dataUrl = preprocessCrop(image, region);
    const {
      data: { text },
    } = await worker.recognize(dataUrl);
    progressState.completedJobs += 1;
    onProgress?.(Math.min(1, progressState.completedJobs / progressState.totalJobs));

    const sanitizedText = sanitizeBlockText(text);
    if (!sanitizedText) {
      continue;
    }

    recognized.push({
      text: sanitizedText,
      region,
      timeHint: getTimeHint(sanitizedText),
      stageHint: findStageHint(sanitizedText),
    });
  }

  return recognized;
}

function buildMatchResults(
  matchedSets: TimetableSet[],
  regions: RecognizedRegion[],
  directMatches: MatchResult[] = [],
): MatchResult[] {
  const rawLineByArtist = new Map<string, string>();

  for (const region of regions) {
    const ranked = rankSetCandidates(region, null, null);
    if (!hasConfidentWinner(ranked)) {
      continue;
    }

    const artistName = ranked[0].set.artistName;
    if (!rawLineByArtist.has(artistName)) {
      rawLineByArtist.set(artistName, region.text.replace(/\n+/g, " / "));
    }
  }

  for (const match of directMatches) {
    if (!rawLineByArtist.has(match.artistName)) {
      rawLineByArtist.set(match.artistName, match.rawLine);
    }
  }

  const map = new Map<string, MatchResult>();

  for (const set of matchedSets) {
    const existing = map.get(set.artistName);
    if (existing) {
      existing.sets.push(set);
    } else {
      map.set(set.artistName, {
        artistName: set.artistName,
        sets: [set],
        rawLine: rawLineByArtist.get(set.artistName) ?? set.artistName,
      });
    }
  }

  for (const match of directMatches) {
    const existing = map.get(match.artistName);
    if (existing) {
      for (const set of match.sets) {
        if (!existing.sets.some((s) => s.id === set.id)) {
          existing.sets.push(set);
        }
      }
    } else {
      map.set(match.artistName, {
        artistName: match.artistName,
        sets: [...match.sets],
        rawLine: rawLineByArtist.get(match.artistName) ?? match.rawLine,
      });
    }
  }

  return Array.from(map.values()).sort(
    (left, right) => left.sets[0].startAt - right.sets[0].startAt,
  );
}

export async function runOCR(
  imageUrl: string,
  onProgress?: (progress: number) => void,
): Promise<OCRResult> {
  if (typeof document === "undefined") {
    return { text: "", day: null, matches: [] };
  }

  onProgress?.(0.02);
  const image = await loadImageElement(imageUrl);
  const regions = detectSetRegions(image);

  const FULL_IMAGE_JOB_COUNT = 1;
  const progressState: OCRProgressState = {
    completedJobs: 0,
    totalJobs: regions.length + FULL_IMAGE_JOB_COUNT,
  };
  const worker = await createOCRWorker(progressState, onProgress);
  const tesseractModule = await import("tesseract.js");

  await worker.setParameters({
    tessedit_pageseg_mode: tesseractModule.PSM.SPARSE_TEXT,
    preserve_interword_spaces: "1",
  });

  try {
    const recognizedRegions = await recognizeRegions(
      worker,
      image,
      regions,
      progressState,
      onProgress,
    );
    const fullText = await recognizeFullImage(
      worker,
      image,
      progressState,
      onProgress,
    );

    const combinedText = [...recognizedRegions.map((region) => region.text), fullText]
      .filter(Boolean)
      .join("\n\n");
    const inferredDay = detectDay(combinedText) ?? inferDayFromRegions(recognizedRegions);

    // Direct matches from both region crops and full image
    const regionDirectMatches = extractRegionDirectMatches(
      recognizedRegions,
      inferredDay,
    );
    const fullDirectMatches = extractMatches(fullText);
    const directMatchMap = new Map<string, MatchResult>();
    for (const match of regionDirectMatches) directMatchMap.set(match.artistName, match);
    for (const match of fullDirectMatches) {
      if (!directMatchMap.has(match.artistName)) {
        directMatchMap.set(match.artistName, match);
      }
    }
    const mergedDirectMatches = Array.from(directMatchMap.values());

    const preliminaryMatchedSets = Array.from(
      new Map(
        [
          ...pickMatchedSets(recognizedRegions, inferredDay),
          ...extractStructuredSetMatches(recognizedRegions, inferredDay),
          ...mergedDirectMatches.flatMap((match) => filterSetsForDay(match.sets, inferredDay)),
        ].map((set) => [set.id, set]),
      ).values(),
    ).sort((left, right) => left.startAt - right.startAt);
    const dayFromMatches =
      inferredDay ??
      (() => {
        const day1Count = preliminaryMatchedSets.filter((set) => set.day === 1).length;
        const day2Count = preliminaryMatchedSets.filter((set) => set.day === 2).length;
        if (day1Count === day2Count) {
          return null;
        }
        return day1Count > day2Count ? 1 : 2;
      })();
    const matchedSets = filterSetsForDay(preliminaryMatchedSets, dayFromMatches);
    const filteredDirectMatches = mergedDirectMatches
      .map((match) => ({
        ...match,
        sets: filterSetsForDay(match.sets, dayFromMatches),
      }))
      .filter((match) => match.sets.length > 0);

    return {
      text: combinedText,
      day: dayFromMatches,
      matches: buildMatchResults(matchedSets, recognizedRegions, filteredDirectMatches),
    };
  } finally {
    await worker.terminate();
  }
}
