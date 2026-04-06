"use client";

import { useEffect } from "react";
import { getPreferredLocale } from "@/lib/i18n/utils";

export default function RootPage() {
  useEffect(() => {
    const locale = getPreferredLocale();
    window.location.replace(`/${locale}`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
      <div className="text-sm">Loading…</div>
    </div>
  );
}
