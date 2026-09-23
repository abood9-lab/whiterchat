import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ar";

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  isRtl: boolean;
  t: (enText: string, arText: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  isRtl: false,
  t: (en, _ar) => en,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("pixlr_lang") as Language;
    if (saved === "ar" || saved === "en") return saved;
    // WhiterChat default language is strictly English unless explicitly changed by user
    return "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("pixlr_lang", newLang);
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  const isRtl = lang === "ar";

  const t = (enText: string, arText: string) => {
    return lang === "ar" ? arText : enText;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, isRtl, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
