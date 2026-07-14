// Bilingual UI layer (AE-19/AE-20). Backed by the labels_i18n table (admin
// editable via the Translations settings page), not a static bundle -- a
// translation fix takes effect for every user on next refresh, no deploy
// needed. Per the architecture doc's FR-013, the toggle here controls UI
// chrome + the *default* language new bills are generated in; a bill/report
// itself stores its own `language` field at creation time and always
// re-renders in that language on reprint, regardless of the toggle's
// current value later.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "./api.js";

const LanguageContext = createContext(null);

const STORAGE_KEY = "ark_lang"; // "EN" | "TA"

function readStoredLang() {
  if (typeof window === "undefined") return "EN";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "TA" ? "TA" : "EN";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);
  const [labels, setLabels] = useState({}); // { [labelKey]: { EN: text, TA: text } }
  const [loaded, setLoaded] = useState(false);

  const refreshLabels = useCallback(async () => {
    try {
      const { data } = await api.get("/labels");
      const map = {};
      for (const row of data) {
        if (!map[row.labelKey]) map[row.labelKey] = {};
        map[row.labelKey][row.lang] = row.labelText;
      }
      setLabels(map);
    } catch {
      // Not fatal -- t() falls back to the English default/key passed by
      // the caller, so a failed fetch (e.g. logged out) just shows English.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshLabels();
  }, [refreshLabels]);

  // Drives the html[lang="ta"] CSS selector (Noto Sans Tamil font-family)
  // so switching languages re-fonts the whole app, not just labels looked
  // up through t().
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "TA" ? "ta" : "en";
    }
  }, [lang]);

  const setLang = useCallback((next) => {
    const value = next === "TA" ? "TA" : "EN";
    setLangState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  }, []);

  // t(key, fallback) -- looks up labelKey in the current language, falls
  // back to English, then to the fallback string, then to the key itself.
  const t = useCallback(
    (key, fallback) => {
      const entry = labels[key];
      if (entry) {
        const text = entry[lang];
        if (text) return text;
        if (entry.EN) return entry.EN;
      }
      return fallback ?? key;
    },
    [labels, lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, loaded, refreshLabels, labels }),
    [lang, setLang, t, loaded, refreshLabels, labels]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
