"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/settings";

export default function NotFound() {
  const { t } = useTranslation();
  const params = useParams();
  const locale = (params?.locale as Locale) || "ja";

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold text-zinc-800">404</h1>
      <p className="mt-4 text-lg text-zinc-300">{t("notFound.title")}</p>
      <p className="mt-2 text-sm text-zinc-500">{t("notFound.description")}</p>
      <Link
        href={`/${locale}`}
        className="mt-8 rounded-xl bg-cyan-500/10 px-6 py-3 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20"
      >
        {t("notFound.goHome")}
      </Link>
    </div>
  );
}
