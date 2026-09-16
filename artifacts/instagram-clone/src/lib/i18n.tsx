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
    const saved = localStorage.getItem("whiterchat_lang") as Language;
    if (saved === "ar" || saved === "en") return saved;
    // Default to en or detect browser
    return navigator.language.startsWith("ar") ? "ar" : "en";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("whiterchat_lang", newLang);
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
