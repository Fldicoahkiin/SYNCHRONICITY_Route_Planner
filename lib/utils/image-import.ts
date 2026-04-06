import Tesseract, { createWorker, type Worker } from "tesseract.js";
import { timetable } from "@/lib/data/timetable";
import { findBestMatch } from "./fuzzy-match";

const artistNames = Array.from(new Set(timetable.map((t) => t.artistName)));
const artistNamesLower = artistNames.map((n) => n.toLowerCase());

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

export function detectDay(text: string): 1 | 2 | null {
  const lower = text.toLowerCase();
  if (/\bday\s*1\b/.test(lower) || /\bday1\b/.test(lower)) return 1;
  if (/\bday\s*2\b/.test(lower) || /\bday2\b/.test(lower)) return 2;
  if (/\b4[./]11\b/.test(text) || /\bapr(il)?\s*11\b/i.test(text)) return 1;
  if (/\b4[./]12\b/.test(text) || /\bapr(il)?\s*12\b/i.test(text)) return 2;
  if (/\bsat\b/i.test(text) && !/\bsun\b/i.test(text)) return 1;
  if (/\bsun\b/i.test(text) && !/\bsat\b/i.test(text)) return 2;
  return null;
}

function sanitizeLine(line: string): string {
  return line
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMatches(ocrText: string): MatchResult[] {
  const lines = ocrText
    .split("\n")
    .map(sanitizeLine)
    .filter((l) => l.length >= 2);

  const matched = new Map<string, MatchResult>();

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.length === 0) continue;

    let artist: string | null = null;

    const exactIndex = artistNamesLower.indexOf(lower);
    if (exactIndex >= 0) {
      artist = artistNames[exactIndex];
    }

    if (!artist) {
      for (let i = 0; i < artistNames.length; i++) {
        const name = artistNames[i];
        const nameLower = artistNamesLower[i];
        if (lower.includes(nameLower) || nameLower.includes(lower)) {
          artist = name;
          break;
        }
      }
    }

    const looksLikeMetadata = /^\d{1,2}[:.]\d{2}/.test(line) || /^[A-Z\s]+$/.test(line);
    if (!artist && !looksLikeMetadata && lower.length >= 3) {
      const best = findBestMatch(lower, artistNames, 0.35);
      if (best) {
        artist = best.candidate;
      }
    }

    if (artist && !matched.has(artist)) {
      const sets = timetable.filter((t) => t.artistName === artist);
      if (sets.length > 0) {
        matched.set(artist, { artistName: artist, sets, rawLine: line });
      }
    }
  }

  return Array.from(matched.values());
}

export function preprocessImage(imageUrl: string, scale = 2): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(imageUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const contrast = 1.4;
      const brightness = 10;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
      }
      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

async function createOCRWorker(
  onProgress?: (progress: number) => void
): Promise<Worker> {
  try {
    return await createWorker("jpn+eng", undefined, {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          onProgress?.(m.progress);
        }
      },
    });
  } catch {
    return await createWorker("eng", undefined, {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          onProgress?.(m.progress);
        }
      },
    });
  }
}

export async function runOCR(
  imageUrl: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  const processedUrl = await preprocessImage(imageUrl, 2);

  const worker = await createOCRWorker(onProgress);

  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(processedUrl);

    const day = detectDay(text);
    const matches = extractMatches(text);

    return { text, day, matches };
  } finally {
    await worker.terminate();
  }
}
