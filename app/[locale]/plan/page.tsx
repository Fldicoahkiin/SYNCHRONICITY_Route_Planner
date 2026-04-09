import type { Metadata } from "next";
import PlanPageClient from "./plan-screen";
import { getPageMetadata } from "@/lib/i18n/page-metadata";
import { timetable } from "@/lib/data/timetable";
import type { Locale } from "@/lib/i18n/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPageMetadata(locale as Locale, "plan");
}

const displayTimetable = timetable.filter(
  (set) => !set.artistName.includes("Talk Live"),
);

export default function PlanPage() {
  return <PlanPageClient timetableSets={displayTimetable} />;
}
