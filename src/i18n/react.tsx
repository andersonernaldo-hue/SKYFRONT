import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LANGUAGES, localeFor, translate, type Language, type Params } from "./index";

const Context = createContext<{ language: Language; changeLanguage: (language: Language) => void } | null>(null);

export function LanguageProvider({ language, onChange, children }: {
  language: Language; onChange: (language: Language) => void; children: ReactNode;
}) {
  const value = useMemo(() => ({ language, changeLanguage: onChange }), [language, onChange]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error("LanguageProvider is required");
  return useMemo(() => {
    const number = new Intl.NumberFormat(localeFor(context.language));
    return {
      ...context,
      t: (source: string, params?: Params) => translate(context.language, source, params),
      n: (value: number) => number.format(value),
      locale: localeFor(context.language),
    };
  }, [context]);
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { language, changeLanguage, t } = useI18n();
  return (
    <label className={`language-select ${compact ? "is-compact" : ""}`}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" />
      </svg>
      {!compact && <span>{t("LANGUAGE")}</span>}
      <select data-uibtn="1" aria-label={t("Choose your language")} value={language}
        onChange={(event) => changeLanguage(event.target.value as Language)}>
        {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
    </label>
  );
}