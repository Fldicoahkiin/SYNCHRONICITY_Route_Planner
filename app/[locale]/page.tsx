import type { Metadata } from "next";
import HomePageClient from "./home-screen";
import { getPageMetadata } from "@/lib/i18n/page-metadata";
import type { Locale } from "@/lib/i18n/settings";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return getPageMetadata(locale as Locale, "home");
}

export default function HomePage() {
  return <HomePageClient />;
}
