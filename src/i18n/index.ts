import { messages } from "./messages";
import { content } from "./content";
import { english } from "./english";
import { combat } from "./combat";

export const LANGUAGES = [
  { code: "es", name: "Espa\u00f1ol", locale: "es-ES" },
  { code: "en", name: "English", locale: "en-US" },
  { code: "pt", name: "Portugu\u00eas", locale: "pt-BR" },
] as const;
export type Language = typeof LANGUAGES[number]["code"];
export type Params = Record<string, string | number>;
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((l) => l.code === value);
export const localeFor = (language: Language) => LANGUAGES.find((l) => l.code === language)!.locale;

export function translate(language: Language, source: string, params: Params = {}): string {
  const key = source.trim().replace(/\s+/g, " ");
  const row = messages[key] ?? content[key] ?? combat[key];
  if (!row && language !== "en") {
    const level = /^WEAPON LV\.(\d+)$/.exec(key);
    if (level) return translate(language, "WEAPON LV.{level}", { level: level[1] });
    const combo = /^COMBO x(\d+)!$/.exec(key);
    if (combo) return translate(language, "COMBO x{count}!", { count: combo[1] });
    const destroyed = /^(.+) DESTROYED$/.exec(key);
    if (destroyed) return translate(language, "{part} DESTROYED", { part: translate(language, destroyed[1]) });
    const counter = /^(HITS|ABILITIES|TIME|KILLS) (.+)$/.exec(key);
    if (counter) return translate(language, `${counter[1]} {value}`, { value: counter[2] });
    const part = /^(ENGINE|DRIVE|TURRET|WING|ARRAY|THRUSTER|CANNON|PRISM|SAIL|BLADE|SCYTHE|FANG) ([LRABC])$/.exec(key);
    if (part) return `${translate(language, part[1])} ${translate(language, part[2])}`;
  }
  const text = language === "en" ? english[key] ?? key : row?.[language === "es" ? 0 : 1] ?? english[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match));
}