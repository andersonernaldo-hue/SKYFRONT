import { DIFFICULTY, type DifficultyName } from "../game/config";
import { useI18n } from "../i18n/react";

export function DifficultySelector({ value, onChange }: { value: DifficultyName; onChange: (difficulty: DifficultyName) => void }) {
  const { t, n } = useI18n();
  return <fieldset className="difficulty-selector">
    <legend className="font-tech text-[10px] text-slate-300 mb-2">{t("DIFFICULTY LEVEL")}</legend>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {(Object.keys(DIFFICULTY) as DifficultyName[]).map((key) => <button type="button" data-uibtn="1" key={key}
        onClick={() => onChange(key)} aria-pressed={value === key} className={`difficulty-choice ${value === key ? "is-selected" : ""}`}>
        <span className="font-tech text-[10px]">{t(key)}</span>
        <span className="text-[11px] text-slate-400 mt-1">{n(DIFFICULTY[key].reward)}x {t("CREDITS")}</span>
        <span className="text-[11px] text-cyan-200">{n(DIFFICULTY[key].xpReward)}x XP</span>
      </button>)}
    </div>
    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t("DIFFICULTY SNAPSHOT")}</p>
  </fieldset>;
}