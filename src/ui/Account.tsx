import { useEffect, useRef, useState } from "react";
import { Btn, Panel } from "./common";
import { useI18n } from "../i18n/react";
import {
  configuredClientId, renderGoogleButton, setClientIdOverride, type GoogleProfile,
} from "../account/google";
import type { Account } from "../account";

type ButtonState = "loading" | "ready" | "unconfigured" | "unavailable";

/** Google's own rendered button, required by their branding guidelines. */
function GoogleButton({ onProfile, onFailure }: { onProfile: (p: GoogleProfile) => void; onFailure: (msg: string) => void }) {
  const { t, language } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ButtonState>("loading");
  const [clientId, setId] = useState(configuredClientId);
  const [manual, setManual] = useState("");
  const latest = useRef({ onProfile, onFailure });
  latest.current = { onProfile, onFailure };

  useEffect(() => {
    if (!clientId) { setState("unconfigured"); return; }
    let alive = true;
    setState("loading");
    renderGoogleButton({
      container: host.current!,
      clientId,
      locale: language,
      text: "continue_with",
      onProfile: (profile) => latest.current.onProfile(profile),
      onError: (reason) => {
        if (!alive) return;
        setState("unavailable");
        if (reason === "invalid") latest.current.onFailure(t("Could not verify the Google response. Try again."));
      },
    }).then((ok) => { if (alive && ok) setState("ready"); });
    return () => { alive = false; };
  }, [clientId, language, t]);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div ref={host} className={state === "ready" ? "min-h-[44px]" : "hidden"} />
      {state === "loading" && <p className="text-xs text-slate-400">{t("Loading Google sign-in...")}</p>}
      {state === "unavailable" && (
        <p className="text-xs text-amber-200 text-center max-w-[300px]">{t("Google sign-in is unavailable right now. You can keep playing as a guest.")}</p>
      )}
      {state === "unconfigured" && (
        <details className="w-full max-w-[320px] text-center">
          <summary className="text-xs text-amber-200 cursor-pointer">{t("Google sign-in is not configured yet.")}</summary>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed text-left">{t("CLIENT ID HELP")}</p>
          <input
            data-uibtn="1"
            className="w-full mt-2 bg-slate-950 border border-cyan-400/30 rounded p-2 text-xs"
            placeholder="xxxx.apps.googleusercontent.com"
            aria-label={t("Google Client ID")}
            value={manual}
            onChange={(event) => setManual(event.target.value)}
          />
          <Btn className="mt-2 !text-[10px] !py-2 w-full" onClick={() => { setClientIdOverride(manual); setId(manual.trim()); }}>
            SAVE CLIENT ID
          </Btn>
        </details>
      )}
    </div>
  );
}

/**
 * Optional sign-in dialog. The game never forces this screen: it opens only
 * from the account panel, and closing it changes nothing about the session.
 */
export function SignInDialog({ onGoogle, onClose, notice }: {
  onGoogle: (profile: GoogleProfile) => void; onClose: () => void; notice?: string;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center p-4 bg-[#03060f]/90 backdrop-blur-md overflow-y-auto no-scrollbar"
      role="dialog" aria-modal="true" aria-label={t("Sign in")}>
      <Panel className="p-6 w-full max-w-[420px] my-6 rise">
        <h1 className="font-tech text-xl font-black text-white text-center">{t("SIGN IN WITH GOOGLE")}</h1>
        <p className="text-center text-xs text-slate-400 mt-2 mb-5">{t("SIGN IN EXPLAINER")}</p>

        <GoogleButton onProfile={onGoogle} onFailure={setError} />

        <p className="text-[11px] text-amber-200/90 mt-4 leading-relaxed text-center">{t("LOCAL ONLY WARNING")}</p>
        {notice && <p className="text-[11px] text-amber-200 mt-3 text-center">{notice}</p>}
        {error && <p className="text-[11px] text-rose-300 mt-3 text-center" role="alert">{error}</p>}

        <Btn className="w-full !py-3 !text-xs mt-5" onClick={onClose}>CANCEL</Btn>
      </Panel>
    </div>
  );
}

export function AccountChip({ account, onOpen }: { account: Account | null; onOpen: () => void }) {
  const { t } = useI18n();
  const guest = !account || account.kind === "guest";
  const label = guest ? t("GUEST") : account!.name;
  return (
    <button data-uibtn="1" onClick={onOpen} className="account-chip" aria-label={`${t("ACCOUNT")}: ${label}`}>
      {!guest && account!.picture
        ? <img src={account!.picture} alt="" className="account-avatar" referrerPolicy="no-referrer" />
        : <span className="account-avatar account-avatar-fallback" aria-hidden="true">{guest ? "🎮" : label.slice(0, 1).toUpperCase()}</span>}
      <span className="truncate max-w-[104px]">{label}</span>
    </button>
  );
}

/** Account details, switching and the guarded progress reset. */
export function AccountPanel({ account, onClose, onSignOut, onSwitch, onReset, hasProgress }: {
  account: Account | null; onClose: () => void; onSignOut: () => void;
  onSwitch: () => void; onReset: () => void; hasProgress: boolean;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const guest = !account || account.kind === "guest";

  return (
    <div className="absolute inset-0 z-[85] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto no-scrollbar"
      role="dialog" aria-modal="true" aria-label={t("ACCOUNT")}>
      <Panel className="p-6 w-full max-w-[420px] my-6 rise">
        <div className="flex items-center gap-3">
          {!guest && account!.picture
            ? <img src={account!.picture} alt="" className="w-12 h-12 rounded-full border border-cyan-400/50" referrerPolicy="no-referrer" />
            : <span className="w-12 h-12 rounded-full border border-cyan-400/50 flex items-center justify-center text-xl bg-black/50">🎮</span>}
          <div className="min-w-0">
            <p className="font-tech text-base font-bold text-white truncate">{guest ? t("GUEST") : account!.name}</p>
            <p className="text-xs text-slate-400 truncate">{guest ? t("Local profile") : account!.email ?? t("Google account")}</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">{t("LOCAL ONLY WARNING")}</p>

        <div className="section-rule mt-5 mb-2">{t("PROGRESS")}</div>
        {!confirming ? (
          <Btn variant="danger" className="w-full !py-3 !text-xs" disabled={!hasProgress} onClick={() => setConfirming(true)}>
            RESET PROGRESS
          </Btn>
        ) : (
          <div className="p-3 rounded border border-rose-400/60 bg-rose-950/30" role="alert">
            <p className="text-sm text-rose-100 font-bold">{t("Delete all progress?")}</p>
            <p className="text-xs text-rose-200/90 mt-2 leading-relaxed">
              {t("RESET WARNING", { profile: guest ? t("GUEST") : account!.name })}
            </p>
            <div className="flex gap-2 mt-4">
              <Btn variant="danger" className="flex-1 !py-2.5 !text-xs" onClick={() => { setConfirming(false); onReset(); }}>
                YES, DELETE
              </Btn>
              <Btn className="flex-1 !py-2.5 !text-xs" onClick={() => setConfirming(false)}>CANCEL</Btn>
            </div>
          </div>
        )}
        {!hasProgress && <p className="text-[11px] text-slate-500 mt-2">{t("No saved progress on this profile yet.")}</p>}

        <div className="section-rule mt-5 mb-2">{t("ACCOUNT")}</div>
        <div className="flex flex-col gap-2">
          {guest
            ? <Btn variant="primary" className="w-full !py-3 !text-xs" onClick={onSwitch}>SIGN IN WITH GOOGLE</Btn>
            : <Btn className="w-full !py-3 !text-xs" onClick={onSignOut}>SIGN OUT</Btn>}
          {!guest && <Btn className="w-full !py-3 !text-xs" onClick={onSwitch}>SWITCH ACCOUNT</Btn>}
          <Btn className="w-full !py-3 !text-xs" onClick={onClose}>BACK</Btn>
        </div>
      </Panel>
    </div>
  );
}

/** Offer to copy guest progress the first time an empty Google profile signs in. */
export function ImportPrompt({ onImport, onSkip }: { onImport: () => void; onSkip: () => void }) {
  const { t } = useI18n();
  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog" aria-modal="true" aria-label={t("Copy guest progress?")}>
      <Panel className="p-6 w-full max-w-[400px] rise">
        <h2 className="font-tech text-lg text-cyan-200">{t("Copy guest progress?")}</h2>
        <p className="text-xs text-slate-300 mt-3 leading-relaxed">{t("IMPORT EXPLAINER")}</p>
        <div className="flex flex-col gap-2 mt-5">
          <Btn variant="primary" className="w-full !py-3 !text-xs" onClick={onImport}>COPY PROGRESS</Btn>
          <Btn className="w-full !py-3 !text-xs" onClick={onSkip}>START FRESH</Btn>
        </div>
      </Panel>
    </div>
  );
}
