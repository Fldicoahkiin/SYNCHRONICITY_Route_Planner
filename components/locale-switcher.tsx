"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";
import { locales, type Locale } from "@/lib/i18n/settings";
import { saveLocale } from "@/lib/i18n/utils";
import { Languages, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function LocaleSwitcher() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const locale = (params?.locale as Locale) || "ja";

  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDesktopOpen(false);
      }
    }
    if (desktopOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [desktopOpen]);

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    saveLocale(next);
    const newPath = pathname.replace(`/${locale}`, `/${next}`) || `/${next}`;
    router.push(newPath);
    setDesktopOpen(false);
    setMobileOpen(false);
  };

  const options = locales.map((l) => ({
    value: l,
    label: t(`localeSwitcher.${l}` as const),
  }));

  return (
    <>
      {/* Desktop dropdown */}
      <div className="relative hidden md:block" ref={containerRef}>
        <button
          onClick={() => setDesktopOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          <Languages className="h-4 w-4" />
          <span className="uppercase">{locale}</span>
          <span className="ml-auto text-xs text-zinc-600">
            {t("localeSwitcher.label")}
          </span>
        </button>
        {desktopOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-lg">
            {options.map((opt) => {
              const active = opt.value === locale;
              return (
                <button
                  key={opt.value}
                  onClick={() => switchLocale(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-zinc-800 text-cyan-400"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  )}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger>
          <div className="fixed right-3 top-3 z-50 flex h-8 cursor-pointer items-center gap-1 rounded-full border border-zinc-700 bg-[#0a0a0a]/80 px-3 text-xs font-medium text-zinc-300 backdrop-blur transition-colors hover:bg-zinc-800 md:hidden">
            <Languages className="h-3.5 w-3.5" />
            <span className="uppercase">{locale}</span>
          </div>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="border-zinc-800 bg-[#0a0a0a] text-zinc-100"
        >
          <SheetHeader>
            <SheetTitle className="text-zinc-100">
              {t("localeSwitcher.label")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1 px-4 pb-6">
            {options.map((opt) => {
              const active = opt.value === locale;
              return (
                <button
                  key={opt.value}
                  onClick={() => switchLocale(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    active
                      ? "bg-zinc-800 text-cyan-400"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  )}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
