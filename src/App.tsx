import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameEngine, type HudState, type RunConfig, type RunResult } from "./game/engine";
import {
  loadGame, saveGame, resetGame, setActiveProfile, ACHIEVEMENTS, achievementProgress,
  mapAccess, levelCap, aircraftLevel, type SaveData,
} from "./game/save";
import { loadAccount, profileFor, storageAvailable, storeAccount, type Account } from "./account";
import { googleSignOut, type GoogleProfile } from "./account/google";
import { AccountChip, AccountPanel, ImportPrompt, SignInDialog } from "./ui/Account";
import { campaignRoute, runAccess } from "./game/access";
import { settleRun } from "./game/settlement";
import { Audio } from "./game/audio";
import { getPlane } from "./game/data/planes";
import { GALAXIES, getMaps, getPlanet, type PlanetDef } from "./game/data/galaxies";
import { Hud } from "./ui/Hud";
import { MainMenu, type Screen } from "./ui/Menu";
import { Hangar, Arsenal, Upgrades, Achievements, Settings } from "./ui/Screens";
import { GalaxyMap, Cinematic } from "./ui/Progression";
import { Loadout } from "./ui/Loadout";
import { Modes } from "./ui/Modes";
import { Btn, Panel } from "./ui/common";
import { isLanguage, localeFor, translate, type Language, type Params } from "./i18n";
import { LanguageProvider, LanguageSelect, useI18n } from "./i18n/react";

const emptyHud: HudState = {
  hp: 100, maxHp: 100, score: 0, combo: 0, comboTimer: 0, comboWindow: 3, wave: 0, waves: 1,
  world: "", worldEmoji: "", mapName: "", weaponLevel: 1, skillCd: 0, skillMax: 1, ultCd: 0, ultMax: 1,
  evadeCd: 0, evadeMax: 30, evadeActive: false,
  passiveName: "", passiveIcon: "", passiveValue: 0, passiveLabel: "",
  bossHp: 0, bossMaxHp: 0, bossName: "", bossPhase: 0, bossParts: 0, bossPartsTotal: 0,
  coins: 0, kills: 0, fps: 60, entities: 0, projectiles: 0, shield: 0, bombs: 0,
  paused: false, warning: 0, multiplier: 1, buffs: [], mode: "campaign", eventName: "", eventTime: 0,
  empLock: 0, wingmen: [], dailyText: "", dailyOk: true, runTime: 0, hits: 0,
};

export default function App() {
  // Order matters: the profile must be selected before the first save read.
  // No forced sign-in screen: without a stored account the game simply starts
  // as guest, and signing in stays available from the account chip at any time.
  const [account, setAccount] = useState<Account | null>(() => {
    const stored = loadAccount();
    setActiveProfile(profileFor(stored));
    return stored;
  });
  const [save, setSaveState] = useState<SaveData>(() => loadGame());
  const [pendingGoogle, setPendingGoogle] = useState<Account | null>(null);
  const [accountPanel, setAccountPanel] = useState(false);
  /** Optional sign-in dialog. Never shown automatically — only when the user asks. */
  const [signInOpen, setSignInOpen] = useState(false);
  const saveRef = useRef(save);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const lastCfg = useRef<RunConfig>({ mode: "campaign", galaxy: 0, planet: 0, map: 0 });
  const busy = useRef(false);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [screen, setScreen] = useState<Screen>("menu");
  const [hud, setHud] = useState(emptyHud);
  const [overlay, setOverlay] = useState<null | "pause" | "result">(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [levelGain, setLevelGain] = useState({ before: 0, after: 0 });
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string; sub: string; color: string } | null>(null);
  const [cine, setCine] = useState<null | { planet: PlanetDef; galaxyName: string; secret?: boolean; then?: () => void }>(null);
  const [entryConfirm, setEntryConfirm] = useState<RunConfig | null>(null);
  const [touch, setTouch] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const t = useCallback((source: string, params?: Params) => translate(saveRef.current.settings.language, source, params), []);
  const n = useMemo(() => new Intl.NumberFormat(localeFor(save.settings.language)), [save.settings.language]);
  const later = useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => { timers.current.delete(timer); fn(); }, ms);
    timers.current.add(timer);
  }, []);

  const setSave = useCallback((fn: (s: SaveData) => SaveData) => {
    const next = fn(saveRef.current);
    saveRef.current = next;
    if (engineRef.current) engineRef.current.save = next;
    setSaveError(!saveGame(next));
    setSaveState(next);
  }, []);
  const changeLanguage = useCallback((language: Language) => {
    if (!isLanguage(language)) return;
    setSave((s) => ({ ...s, settings: { ...s.settings, language } }));
  }, [setSave]);

  const toast = useCallback((msg: string, kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-2), { id, msg: t(msg), kind }]);
    later(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, [later, t]);
  const showBanner = useCallback((text: string, sub: string, color = "#ffd23d") => {
    const id = Date.now() + Math.random();
    setBanner({ id, text, sub, color });
    later(() => setBanner((current) => current?.id === id ? null : current), 1700);
  }, [later]);

  useEffect(() => { document.documentElement.lang = save.settings.language; }, [save.settings.language]);
  useEffect(() => { document.documentElement.dataset.quality = save.settings.quality; }, [save.settings.quality]);
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setTouch(coarse);
    const initial = saveRef.current;
    if (initial.stats.games === 0 && initial.settings.quality === "HIGH" && (coarse || (navigator.hardwareConcurrency || 8) <= 4)) {
      setSave((s) => ({ ...s, settings: { ...s.settings, quality: "MEDIUM" } }));
    }
    Audio.setMusicVolume(initial.settings.music);
    Audio.setSfxVolume(initial.settings.sfx);
    Audio.mute(initial.settings.muted);
    const unlock = () => {
      Audio.resume();
      if (!engineRef.current?.running && !busy.current) Audio.playMusic("MENU");
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    const resize = () => engineRef.current?.resize();
    const bomb = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!event.repeat && event.key.toLowerCase() === "b" && engine?.running && !engine.paused && !engine.over) engine.useBomb();
    };
    const hidden = () => { if (document.hidden) engineRef.current?.setPaused(true); };
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", bomb);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", bomb);
      document.removeEventListener("visibilitychange", hidden);
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [setSave]);

  const finishRun = useCallback((raw: RunResult) => {
    const settlement = settleRun(saveRef.current, raw);
    if (settlement.duplicate) return;
    setSave(() => settlement.save);
    setResult(settlement.result);
    setLevelGain({ before: settlement.planeBefore, after: settlement.planeAfter });
    setOverlay("result");
    setBanner(null);
    if (settlement.unlockedPlanet) toast(t("{name} unlocked", { name: t(settlement.unlockedPlanet) }), "good");
    if (settlement.unlockedGalaxy) toast(t("{name} unlocked", { name: settlement.unlockedGalaxy }), "good");
    const award = ACHIEVEMENTS.find((a) => !settlement.save.achievements.includes(a.id) && achievementProgress(a, settlement.save) >= a.target);
    if (award) later(() => toast(t("{name} reward available", { name: t(award.name) }), "good"), 600);
  }, [setSave, toast, t, later]);

  const ensureEngine = useCallback(() => {
    if (engineRef.current || !canvasRef.current) return engineRef.current;
    engineRef.current = new GameEngine(canvasRef.current, saveRef.current, {
      onHud: setHud, onEnd: finishRun,
      onEvent: (type, data) => {
        if (type === "entryPaid") { setSave(() => data as SaveData); return; }
        if (type === "accessDenied") { toast(String(data), "bad"); return; }
        if (type === "wave") showBanner(`${t("WAVE")} ${data}`, t("INCOMING"), "#2ee6ff");
        else if (type === "formation") showBanner(t(data), t("ENEMY FORMATION"), "#8fd0e8");
        else if (type === "squad") { showBanner(data.name, t("TACTICAL SQUAD"), "#ffb020"); toast(t(data.threat)); }
        else if (type === "partLost") toast(`${t(data.label)} / ${t(data.effect)}`, "good");
        else if (type === "bossReady" && data.ability) toast(t(data.ability));
        else if (type === "bossSpecial") showBanner(t("DESPERATION"), t("BRACE FOR IMPACT"), "#ff2d3d");
        else if (type === "boss") showBanner(t(data.secret ? "SECRET BOSS" : "BOSS"), data.name, "#ff2d6f");
        else if (type === "phase") showBanner(`${t("PHASE")} ${data}`, t(data >= 4 ? "ENRAGED" : "ESCALATING"), "#ff8a3d");
        else if (type === "miniboss") showBanner(t("MINI BOSS"), t("ELITE TARGET"), "#ffd23d");
        else if (type === "eventStart") showBanner(t(data), t("DYNAMIC EVENT"), "#ffb020");
        else if (type === "killcam") showBanner(t("TARGET DESTROYED"), data, "#ffd23d");
        else if (type === "empBlocked") toast(t("ABILITIES OFFLINE"), "bad");
        else if (type === "perfectEvade") showBanner(t("PERFECT EVASION"), t("{count} ATTACKS DODGED", { count: data.dodges }), data.boss ? "#ffd23d" : "#7ff0ff");
        else if (type === "quality") toast(t("Graphics set to {quality}", { quality: t(data) }));
      },
    });
    return engineRef.current;
  }, [finishRun, showBanner, toast, setSave, t]);

  const doLaunch = useCallback((cfg: RunConfig) => {
    const access = runAccess(saveRef.current, cfg);
    if (!access.ok) { busy.current = false; toast(access.reason, "bad"); return; }
    const engine = ensureEngine();
    if (!engine) { busy.current = false; return; }
    if (engine.running && !engine.over && !engine.paused) { busy.current = false; return; }
    engine.save = saveRef.current;
    engine.setQuality(saveRef.current.settings.quality);
    Audio.resume();
    if (!engine.startRun(cfg)) { busy.current = false; return; }
    lastCfg.current = { ...engine.cfg };
    setScreen("game"); setOverlay(null); setResult(null);
    const planet = getPlanet(cfg.galaxy, cfg.planet);
    if (cfg.mode !== "secret" && cfg.mode !== "bossrush") {
      showBanner(cfg.mode === "endless" ? t("ENDLESS SURVIVAL") : cfg.mode === "daily" ? t("DAILY CHALLENGE") : t(getMaps(planet)[cfg.map].name), t(planet.name), "#2ee6ff");
    }
    busy.current = false;
  }, [ensureEngine, showBanner, toast, t]);

  const beginLaunch = useCallback((cfg: RunConfig) => {
    if (busy.current) return;
    busy.current = true;
    const snapshot = { ...cfg, difficulty: cfg.difficulty ?? saveRef.current.settings.difficulty };
    const planet = getPlanet(cfg.galaxy, cfg.planet);
    const cinematic = saveRef.current.settings.cinematics && (cfg.mode === "secret" || (cfg.mode === "campaign" && cfg.map === 0));
    if (cinematic) {
      engineRef.current?.stop();
      setCine({ planet, galaxyName: GALAXIES[cfg.galaxy].name, secret: cfg.mode === "secret", then: () => doLaunch(snapshot) });
    } else doLaunch(snapshot);
  }, [doLaunch]);

  // All paths (continue, sector selection, next, retry and restart) share this gate.
  const launch = useCallback((cfg: RunConfig) => {
    if (busy.current) return;
    const gate = runAccess(saveRef.current, cfg);
    if (!gate.ok) { toast(gate.reason, "bad"); return; }
    if (cfg.mode === "secret") setEntryConfirm(cfg);
    else beginLaunch(cfg);
  }, [beginLaunch, toast]);

  const go = useCallback((target: Screen) => {
    engineRef.current?.stop();
    setScreen(target); setOverlay(null); setBanner(null); setHud(emptyHud);
    Audio.playMusic("MENU", true);
  }, []);

  /* ------------------------- accounts ------------------------- */
  /** Switches save slot and reloads that profile's progress. */
  const applyAccount = useCallback((next: Account | null) => {
    engineRef.current?.stop();
    busy.current = false;
    setActiveProfile(profileFor(next));
    const loaded = loadGame();
    saveRef.current = loaded;
    if (engineRef.current) engineRef.current.save = loaded;
    setSaveState(loaded);
    setAccount(next);
    storeAccount(next);
    setAccountPanel(false);
    setPendingGoogle(null);
    setSignInOpen(false);
    setScreen("menu"); setOverlay(null); setBanner(null); setHud(emptyHud);
  }, []);

  const chooseGoogle = useCallback((profile: GoogleProfile) => {
    const next: Account = {
      kind: "google", id: profile.sub, name: profile.name,
      email: profile.email, picture: profile.picture, since: Date.now(),
    };
    Audio.resume();
    // Offer a one-time copy when this Google slot is empty but guest progress exists.
    const guestSave = loadGame("");
    const guestPlayed = guestSave.stats.games > 0 || guestSave.planeData[guestSave.selected]?.level > 0;
    const target = loadGame(profileFor(next));
    const targetPlayed = target.stats.games > 0 || target.planeData[target.selected]?.level > 0;
    if (guestPlayed && !targetPlayed) { setPendingGoogle(next); return; }
    applyAccount(next);
  }, [applyAccount]);

  const importGuestProgress = useCallback(() => {
    if (!pendingGoogle) return;
    const guestSave = loadGame("");
    saveGame(guestSave, profileFor(pendingGoogle));
    applyAccount(pendingGoogle);
    toast("Guest progress copied to your account.", "good");
  }, [pendingGoogle, applyAccount, toast]);

  /** Signing out returns to the guest profile and its own local progress. */
  const signOut = useCallback(() => {
    googleSignOut();
    applyAccount(null);
  }, [applyAccount]);

  /** Wipes only the active profile, keeping the chosen language. */
  const resetProgress = useCallback(() => {
    engineRef.current?.stop();
    const fresh = resetGame();
    fresh.settings.language = saveRef.current.settings.language;
    saveRef.current = fresh;
    saveGame(fresh);
    if (engineRef.current) engineRef.current.save = fresh;
    setSaveState(fresh);
    setAccountPanel(false);
    setScreen("menu"); setOverlay(null); setBanner(null); setHud(emptyHud);
    toast("Progress reset");
  }, [toast]);
  useEffect(() => {
    if (screen !== "game") return;
    if (hud.paused && overlay !== "result") setOverlay("pause");
    else if (!hud.paused && overlay === "pause") setOverlay(null);
  }, [hud.paused, screen, overlay]);

  const route = useMemo(() => campaignRoute(save), [save]);
  const plane = useMemo(() => getPlane(result?.planeId ?? save.selected), [result?.planeId, save.selected]);
  const inGame = screen === "game";
  const hasProgress = save.stats.games > 0 || save.level > 1 || (save.planeData[save.selected]?.level ?? 0) > 0
    || Object.values(save.planetProgress).some((p) => p.maps > 0);
  const fee = entryConfirm ? getPlanet(entryConfirm.galaxy, entryConfirm.planet).secretFee : null;

  return (
    <LanguageProvider language={save.settings.language} onChange={changeLanguage}>
      <div className="fixed inset-0 bg-[#03060f] flex items-center justify-center overflow-hidden">
        <div className="game-shell relative w-full h-full max-w-[820px] mx-auto overflow-hidden" style={{ boxShadow: "0 0 80px rgba(0,0,0,0.9)" }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-label={t("CAMPAIGN")} style={{ visibility: inGame ? "visible" : "hidden" }} />
          {!inGame && <MenuBackdrop />}
          {inGame && overlay !== "result" && <Hud hud={hud} plane={plane} touch={touch}
            onPause={() => engineRef.current?.setPaused(true)} onSkill={() => engineRef.current?.useSkill()}
            onUlt={() => engineRef.current?.useUltimate()} onBomb={() => engineRef.current?.useBomb()}
            onEvade={() => engineRef.current?.useEvade()} />}
          {screen === "menu" && <MainMenu save={save} go={go} onPlay={() => route.secret && !route.training ? go("missions") : launch(route.cfg)}
            accountSlot={<AccountChip account={account} onOpen={() => setAccountPanel(true)} />} />}
          {screen === "hangar" && <Hangar save={save} set={setSave} back={() => go("menu")} toast={toast} />}
          {screen === "arsenal" && <Arsenal save={save} set={setSave} back={() => go("menu")} toast={toast} />}
          {screen === "upgrades" && <Upgrades save={save} set={setSave} back={() => go("menu")} toast={toast} />}
          {screen === "loadout" && <Loadout save={save} set={setSave} back={() => go("menu")} toast={toast} />}
          {screen === "missions" && <GalaxyMap save={save} set={setSave} back={() => go("menu")} launch={launch} toast={toast}
            playCinematic={(planet, galaxy) => setCine({ planet, galaxyName: GALAXIES[galaxy].name })} />}
          {screen === "modes" && <Modes save={save} back={() => go("menu")} launch={launch} toast={toast} />}
          {screen === "achievements" && <Achievements save={save} set={setSave} back={() => go("menu")} toast={toast} />}
          {screen === "settings" && <Settings save={save} set={setSave} back={() => go("menu")} toast={toast}
            onReset={resetProgress} />}

          {banner && inGame && !overlay && <div key={banner.id} className="game-banner" style={{ ["--bc" as any]: banner.color }}>
            <div className="game-banner-rule" />
            <div className="game-banner-text font-tech">{banner.text}</div>
            <div className="game-banner-sub font-tech">{banner.sub}</div>
            <div className="game-banner-rule is-bottom" />
          </div>}
          {cine && <Cinematic planet={cine.planet} galaxyName={cine.galaxyName} secret={cine.secret}
            onDone={() => { const action = cine.then; setCine(null); if (action) action(); else Audio.playMusic("MENU", true); }} />}

          {overlay === "pause" && <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center px-5 z-40">
            <Panel className="p-6 w-full max-w-[400px] rise">
              <div className="pause-bars" aria-hidden="true"><span /><span /></div>
              <h2 className="font-tech text-2xl font-black text-center mb-1 glow-text tracking-[0.3em]">{t("PAUSED")}</h2>
              <div className="section-rule justify-center mb-4"><span /></div>
              <div className="mb-4"><LanguageSelect /></div>
              <div className="grid grid-cols-2 gap-2 text-center mb-4">
                <Info label="SCORE" value={n.format(hud.score)} /><Info label="KILLS" value={n.format(hud.kills)} />
              </div>
              <div className="flex flex-col gap-2">
                <Btn variant="primary" onClick={() => engineRef.current?.setPaused(false)}>RESUME</Btn>
                <Btn onClick={() => launch(lastCfg.current)}>RESTART</Btn>
                <Btn variant="danger" onClick={() => go("menu")}>ABANDON MISSION</Btn>
              </div>
            </Panel>
          </div>}

          {overlay === "result" && result && <Results result={result} save={save} levelGain={levelGain}
            onRetry={() => launch(lastCfg.current)} onNext={() => launch({ ...lastCfg.current, map: result.map + 1 })}
            onMenu={() => go("menu")} onSectors={() => go("missions")} />}
          {entryConfirm && fee && <div className="absolute inset-0 z-[70] flex items-center justify-center p-5 bg-black/85 backdrop-blur-md" role="dialog" aria-modal="true" aria-label={t("Confirm entry")}>
            <Panel className="p-6 w-full max-w-[430px] rise">
              <h2 className="font-tech text-xl text-purple-200 mb-3">{t("Confirm entry")}</h2>
              <p className="font-tech text-lg text-amber-300 mb-3">{n.format(fee.coins)} {t("CREDITS")} + {n.format(fee.crystals)} {t("CRYSTALS")}</p>
              <p className="text-sm text-slate-300 mb-5">{t("ENTRY PER ATTEMPT")}</p>
              <div className="flex gap-2">
                <Btn variant="primary" onClick={() => { const cfg = entryConfirm; setEntryConfirm(null); beginLaunch(cfg); }}>CONFIRM</Btn>
                <Btn onClick={() => setEntryConfirm(null)}>CANCEL</Btn>
              </div>
            </Panel>
          </div>}
          {accountPanel && <AccountPanel account={account} hasProgress={hasProgress}
            onClose={() => setAccountPanel(false)} onSignOut={signOut}
            onSwitch={() => { setAccountPanel(false); setSignInOpen(true); }} onReset={resetProgress} />}
          {pendingGoogle && <ImportPrompt onImport={importGuestProgress} onSkip={() => applyAccount(pendingGoogle)} />}
          {signInOpen && <SignInDialog onGoogle={chooseGoogle} onClose={() => setSignInOpen(false)}
            notice={storageAvailable() ? undefined : t("Save unavailable")} />}

          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-max max-w-[94%] flex flex-col items-center gap-1 pointer-events-none z-[80]" aria-live="polite">
            {toasts.map((item) => <div key={item.id} className={`toast toast-${item.kind} rise`}>
              <span className="toast-icon" aria-hidden="true">{item.kind === "good" ? "✔" : item.kind === "bad" ? "✖" : "ℹ"}</span>
              <span>{item.msg}</span>
            </div>)}
          </div>
          {saveError && !inGame && <p role="status" className="absolute bottom-1 left-3 right-3 text-xs text-amber-200 bg-black/90 p-2 z-50">{t("Save unavailable")}</p>}
        </div>
      </div>
    </LanguageProvider>
  );
}

/** Animates a number from 0 to `target` with an ease-out curve. */
function useCountUp(target: number, ms = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function Results({ result, save, levelGain, onRetry, onNext, onMenu, onSectors }: {
  result: RunResult; save: SaveData; levelGain: { before: number; after: number };
  onRetry: () => void; onNext: () => void; onMenu: () => void; onSectors: () => void;
}) {
  const { t, n } = useI18n();
  const planet = getPlanet(result.galaxy, result.planet);
  const next = result.map < 9 ? mapAccess(save, result.galaxy, result.planet, result.map + 1) : null;
  const shownScore = useCountUp(result.score);
  const shownCoins = useCountUp(result.coins, 900);
  const shownXp = useCountUp(result.planeXp, 900);
  const leveled = levelGain.after > levelGain.before;
  const sections = [["COMBAT LOOT", result.rewards.combat], ["COMPLETION REWARD", result.rewards.completion],
    ["FIRST CLEAR BONUS", result.rewards.firstClear], ["DAILY BONUS", result.rewards.daily]] as const;
  return (
    <div className={`absolute inset-0 overflow-y-auto no-scrollbar z-40 p-4 results-screen ${result.victory ? "is-victory" : "is-defeat"}`}>
      <div className="results-beam" aria-hidden="true" />
      <Panel className="p-5 sm:p-6 w-full max-w-[470px] mx-auto my-5 rise">
        <div className="text-center font-tech text-[9px] tracking-[0.35em] text-slate-400 mb-1">{t(result.victory ? "MISSION REPORT" : "MISSION REPORT")}</div>
        <h2 className={`results-title font-tech text-2xl sm:text-3xl font-black text-center ${result.victory ? "text-amber-300 glow-text-gold" : "text-rose-400 glow-text-red"}`}>
          {t(result.victory ? result.mode === "secret" ? "SECRET BOSS SLAIN" : "MISSION COMPLETE" : "AIRCRAFT DOWN")}
        </h2>
        <p className="text-center text-xs text-slate-400 mt-2 mb-4">{t(planet.name)} / {t("SECTOR")} {result.map + 1} / {t(result.difficulty)}</p>
        {result.mode === "daily" && (
          <p className="text-center text-3xl mb-3 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < result.stars ? "star-pop" : ""} style={{ color: i < result.stars ? "#ffd23d" : "rgba(255,255,255,0.18)", animationDelay: `${0.35 + i * 0.18}s` }}>★</span>
            ))}
          </p>
        )}
        <div className="text-center pop mb-4">
          <div className="font-tech text-[10px] tracking-[0.3em] text-slate-400">{t("FINAL SCORE")}</div>
          <div className="font-tech text-4xl sm:text-5xl font-black text-white glow-text tabular-nums leading-none mt-1">{n(shownScore)}</div>
        </div>
        {result.score >= save.highScore && result.score > 0 && <p className="text-xs text-cyan-300 text-center mb-3">{t("NEW HIGH SCORE")}</p>}
        <div className="section-rule mb-2">{t("Rewards")}</div>
        <div className="grid grid-cols-3 gap-2 text-center stagger">
          <Reward label="CREDITS" value={`+${n(shownCoins)}`} color="#ffb020" />
          <Reward label="CRYSTALS" value={`+${n(result.crystals)}`} color="#2ee6ff" />
          <Reward label="AIRFRAME XP" value={`+${n(shownXp)}`} color="#10f0a0" />
        </div>
        <p className="text-xs text-slate-400 mt-2">{t("DIFFICULTY BONUS")}: {t(result.difficulty)} / {n(result.rewards.coinMultiplier)}x {t("CREDITS")} / {n(result.rewards.xpMultiplier)}x XP</p>
        <details className="reward-breakdown mt-3">
          <summary className="cursor-pointer text-sm text-cyan-200">{t("COMPLETION REWARD")} + {t("COMBAT LOOT")}</summary>
          {sections.filter(([, amount]) => amount.coins + amount.xp + amount.crystals > 0).map(([label, amount]) => <div key={label} className="flex justify-between gap-2 text-xs py-2 border-b border-white/10">
            <span>{t(label)}</span><span className="text-right tabular-nums">{n(amount.coins)} {t("CREDITS")}<br />{n(amount.crystals)} {t("CRYSTALS")} / {n(amount.xp)} XP</span>
          </div>)}
        </details>
        <div className={`airframe-result mt-4 ${leveled ? "is-levelup" : ""}`}>
          {leveled && <div className="font-tech text-[9px] tracking-[0.3em] text-amber-300 mb-1 levelup-tag">▲ {t("AIRCRAFT LEVEL UP")}</div>}
          <strong className="text-cyan-200">{t("{name}: level {before} to {after}", { name: getPlane(result.planeId).name, before: levelGain.before, after: levelGain.after })}</strong>
          <p className="text-xs text-slate-400 mt-1">{t("AIRCRAFT XP NOTE")}</p>
          {aircraftLevel(save, result.planeId) >= levelCap(save) && <p className="text-amber-300 text-xs mt-1">{t("LEVEL CAP REACHED")}: {levelCap(save)}</p>}
        </div>
        <div className="section-rule mt-4 mb-2">{t("Performance")}</div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <Info label="BEST COMBO" value={`x${result.bestCombo}`} /><Info label="KILLS" value={n(result.kills)} />
          <Info label="HITS TAKEN" value={n(result.hits)} /><Info label="TIME" value={`${n(Math.round(result.time))}s`} />
          {result.mode === "endless" && <Info label="WAVE REACHED" value={n(result.wave)} />}
          {result.mode === "bossrush" && <Info label="BOSSES" value={n(result.bossesDefeated)} />}
        </div>
        <div className="flex flex-col gap-2 mt-5">
          {result.victory && result.mode === "campaign" && result.map < 9 && <>
            <Btn variant="primary" disabled={!next?.ok} onClick={onNext}>NEXT SECTOR</Btn>
            {!next?.ok && <p className="text-xs text-amber-200 text-center">{next?.reason}. {t("TRAINING NOTE")}</p>}
          </>}
          <Btn onClick={onRetry}>RETRY</Btn>
          <Btn onClick={onSectors}>VIEW SECTORS</Btn>
          <Btn onClick={onMenu}>COMMAND CENTER</Btn>
        </div>
      </Panel>
    </div>
  );
}

function Reward({ label, value, color }: { label: string; value: string; color: string }) {
  const { t } = useI18n();
  return <div className="panel-soft py-2.5 rounded" style={{ borderColor: `${color}55` }}>
    <div className="font-tech text-sm font-black" style={{ color }}>{value}</div>
    <div className="text-[9px] tracking-wide text-slate-400 mt-1">{t(label)}</div>
  </div>;
}
function Info({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  return <div className="py-2"><div className="font-tech text-sm text-cyan-200 font-bold">{value}</div><div className="text-[9px] text-slate-400">{t(label)}</div></div>;
}
function MenuBackdrop() {
  return <div className="space-bg" aria-hidden="true">
    <div className="absolute inset-0 grid-bg opacity-30" />
    <div className="nebula" style={{ width: 520, height: 520, top: -160, left: -180, background: "#1d6fb8" }} />
    <div className="nebula" style={{ width: 620, height: 620, bottom: -220, right: -200, background: "#6b1fb0", animationDelay: "-7s" }} />
    <div className="nebula" style={{ width: 380, height: 380, top: "40%", left: "55%", background: "#ff2d6f", opacity: 0.14, animationDelay: "-12s" }} />
    <div className="scan-beam" />
    <div className="absolute inset-0 scanlines" />
  </div>;
}
