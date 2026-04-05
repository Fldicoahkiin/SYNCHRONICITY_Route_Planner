import type { TimetableSet } from "@/lib/data/timetable";

function formatIcalDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const h = String(dt.getUTCHours()).padStart(2, "0");
  const min = String(dt.getUTCMinutes()).padStart(2, "0");
  const s = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function generateIcal(
  sets: TimetableSet[],
  title: string,
  description: string
): string {
  const uidBase = `synchronicity26-${Date.now()}`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SYNCHRONICITY'26//Route Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(title)}`,
    `X-WR-CALDESC:${escapeIcal(description)}`,
  ];

  sets.forEach((s, idx) => {
    const start = new Date(s.startAt * 1000);
    const end = new Date(s.finishAt * 1000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uidBase}-${idx}@synchronicity26`);
    lines.push(`DTSTAMP:${formatIcalDate(new Date())}`);
    lines.push(`DTSTART:${formatIcalDate(start)}`);
    lines.push(`DTEND:${formatIcalDate(end)}`);
    lines.push(`SUMMARY:${escapeIcal(s.artistName)}`);
    lines.push(`LOCATION:${escapeIcal(s.stageName)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcal(sets: TimetableSet[], filename: string, title: string, description: string) {
  const blob = new Blob([generateIcal(sets, title, description)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
