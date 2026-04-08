"use client";

import i18next from "i18next";
import {
  initReactI18next,
  I18nextProvider,
  useTranslation as useTranslationOrg,
} from "react-i18next";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { resources } from "./locales";
import { defaultLocale, type Locale } from "./settings";

export function initI18nClient(lng: Locale) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng,
    fallbackLng: defaultLocale,
    defaultNS: "common",
    ns: ["common"],
    resources,
    interpolation: { escapeValue: false, prefix: "{{", suffix: "}}" },
    react: { useSuspense: false },
  });
  return instance;
}

export function I18nProvider({
  lng,
  children,
}: {
  lng: Locale;
  children: ReactNode;
}) {
  const [instance] = useState(() => initI18nClient(lng));
  useEffect(() => {
    if (instance.language !== lng) {
      instance.changeLanguage(lng);
    }
  }, [lng, instance]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}

export function useTranslation(ns = "common") {
  return useTranslationOrg(ns);
}
