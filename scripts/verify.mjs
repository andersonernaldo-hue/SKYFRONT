import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

// Standalone verification: node scripts/verify.mjs
const root = process.cwd();
const configFile = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
const program = ts.createProgram(config.fileNames, { ...config.options, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => root, getNewLine: () => "\n", getCanonicalFileName: (file) => file,
  }));
  process.exit(1);
}

// Test TypeScript directly in memory; no generated project files or extra dependencies.
const require = createRequire(import.meta.url);
// Vite replaces `import.meta.env` at build time; mirror that for the CommonJS harness.
globalThis.__VITE_ENV__ = {};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8").replace(/import\.meta\.env/g, "globalThis.__VITE_ENV__");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
}

const save = require("../src/game/save.ts");
const { GALAXIES, getMaps } = require("../src/game/data/galaxies.ts");
const { DIFFICULTY } = require("../src/game/config.ts");
const { runAccess, campaignRoute } = require("../src/game/access.ts");
const { calculateRewards, sectorContract, emptyReward } = require("../src/game/economy.ts");
const { settleRun } = require("../src/game/settlement.ts");
const { advanceAirframe, planeXpForLevel } = require("../src/game/progression.ts");
const { makeDaily } = require("../src/game/data/talents.ts");
const { translate, LANGUAGES } = require("../src/i18n/index.ts");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { LanguageProvider } = require("../src/i18n/react.tsx");
const { Settings } = require("../src/ui/Screens.tsx");

let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }

const storage = new Map();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key),
} });

const cfg = { mode: "campaign", galaxy: 0, planet: 0, map: 0 };
function result(overrides = {}) {
  const rewards = calculateRewards(cfg, "NORMAL", true, { coins: 200, crystals: 1, xp: 300 }, true);
  return {
    ...rewards.total, rewards: rewards.breakdown, runId: "test-run", planeId: "falcon", planeXp: rewards.total.xp,
    difficulty: "NORMAL", victory: true, score: 12000, kills: 20, bestCombo: 15, bossKilled: true,
    mode: "campaign", galaxy: 0, planet: 0, map: 0, wave: 3, hits: 0, abilities: 1, time: 45,
    stars: 3, secretDefeated: false, bossesDefeated: 1, ...overrides,
  };
}

test("Fresh aircraft starts at level 0", () => {
  const s = save.defaultSave();
  assert.equal(save.aircraftLevel(s), 0);
  assert.equal(save.isMapUnlocked(s, 0, 0, 0), true);
  assert.equal(save.isMapUnlocked(s, 0, 0, 1), false);
});

test("Both previous victory and aircraft level are required", () => {
  const s = save.defaultSave();
  s.level = 700;
  s.planeData.falcon.level = 10;
  assert.equal(save.isMapUnlocked(s, 0, 0, 1), false);
  s.planetProgress["0_0"].maps = 1;
  s.planeData.falcon.level = 9;
  assert.equal(save.isMapUnlocked(s, 0, 0, 1), false);
  s.planeData.falcon.level = 10;
  assert.equal(save.isMapUnlocked(s, 0, 0, 1), true);
  assert.equal(save.isMapUnlocked(s, 0, 0, 2), false);
});

test("Continue chooses a legal training sector rather than bypassing a gate", () => {
  const s = save.defaultSave();
  s.planetProgress["0_0"].maps = 1;
  s.planeData.falcon.level = 9;
  const route = campaignRoute(s);
  assert.equal(route.training, true);
  assert.equal(route.cfg.map, 0);
  assert.equal(route.nextLevel, 10);
  assert.equal(runAccess(s, route.cfg).ok, true);
});

test("All 70 cumulative thresholds, including galaxy boundaries", () => {
  const s = save.defaultSave();
  s.galaxyProgress = 2;
  let index = 0;
  GALAXIES.forEach((galaxy, g) => galaxy.planets.forEach((planet, p) => {
    s.planetProgress[`${g}_${p}`] = { maps: 10, stars: [], secret: true };
    getMaps(planet).forEach((_, m) => {
      const threshold = index * 100 + m * 10;
      assert.equal(save.sectorRequiredLevel(g, p, m), threshold);
      if (threshold > 0) {
        s.planeData.falcon.level = threshold - 1;
        assert.equal(save.isMapUnlocked(s, g, p, m), false);
      }
      s.planeData.falcon.level = threshold;
      assert.equal(save.isMapUnlocked(s, g, p, m), true);
    });
    index++;
  }));
  assert.equal(save.sectorRequiredLevel(1, 0, 0), 300);
  assert.equal(save.sectorRequiredLevel(1, 3, 9), 690);
});

test("Changing aircraft cannot use commander levels to skip sectors", () => {
  const s = save.defaultSave();
  s.planes.push("phantom"); s.selected = "phantom";
  s.planeData.phantom = save.defaultPlaneSave();
  s.planeData.falcon.level = 100; s.level = 100;
  s.planetProgress["0_0"].maps = 10;
  assert.equal(runAccess(s, { ...cfg, map: 1 }).ok, false);
});

test("Secrets require aircraft cap and entry payment", () => {
  const s = save.defaultSave();
  s.planetProgress["0_0"].maps = 10;
  s.level = 700; s.planeData.falcon.level = 99;
  s.coins = 100000; s.crystals = 100;
  assert.equal(runAccess(s, { ...cfg, mode: "secret", map: 9 }).ok, false);
  s.planeData.falcon.level = 100;
  assert.equal(runAccess(s, { ...cfg, mode: "secret", map: 9 }).ok, true);
  s.coins = 0;
  assert.equal(runAccess(s, { ...cfg, mode: "secret", map: 9 }).ok, false);
});

test("Invalid indexes never silently become valid missions", () => {
  const s = save.defaultSave();
  for (const bad of [{ galaxy: -1 }, { galaxy: 9 }, { planet: 10 }, { map: -1 }, { map: 10 }, { map: 0.5 }, { difficulty: "IMPOSSIBLE" }]) {
    assert.equal(runAccess(s, { ...cfg, ...bad }).ok, false);
  }
  assert.equal(runAccess(s, { ...cfg, mode: "endless", galaxy: 1, planet: 3 }).ok, false);
  assert.equal(runAccess(s, { ...cfg, mode: "endless", map: 5 }).ok, true);
});

test("Rewards scale monotonically with difficulty", () => {
  const raw = { coins: 1000, crystals: 10, xp: 1000 };
  let previous = emptyReward();
  for (const difficulty of Object.keys(DIFFICULTY)) {
    const reward = calculateRewards(cfg, difficulty, true, raw, true).total;
    assert.ok(reward.coins > previous.coins && reward.xp > previous.xp && reward.crystals >= previous.crystals);
    previous = reward;
  }
});

test("XP and credit modifiers are applied exactly once", () => {
  const raw = { coins: 1000, crystals: 8, xp: 1000 };
  const earned = calculateRewards(cfg, "HARD", false, raw, false, 1.35, 1.25);
  assert.equal(earned.total.xp, Math.floor(1000 * 1.3 * 1.25));
  assert.equal(earned.total.coins, Math.floor(1000 * 1.45 * 1.35));
  assert.deepEqual(earned.breakdown.completion, emptyReward());
  assert.deepEqual(earned.breakdown.firstClear, emptyReward());
});

test("First-clear rewards cannot be earned on replays or failure", () => {
  const raw = { coins: 200, crystals: 1, xp: 300 };
  const first = calculateRewards(cfg, "NORMAL", true, raw, true);
  const replay = calculateRewards(cfg, "NORMAL", true, raw, false);
  assert.ok(first.total.xp > replay.total.xp);
  assert.equal(first.breakdown.firstClear.xp, Math.round(sectorContract(0, 0, 0).xp * 0.5));
  assert.deepEqual(replay.breakdown.firstClear, emptyReward());
  assert.ok(replay.total.xp > 0);
});

test("The level-60 ceiling is removed, progression reaches 700", () => {
  assert.equal(advanceAirframe(60, 0, planeXpForLevel(60), 100).level, 61);
  assert.equal(advanceAirframe(99, 0, 100000, 100).level, 100);
  assert.equal(advanceAirframe(199, 0, 100000, 200).level, 200);
  assert.equal(advanceAirframe(699, 0, 100000, 700).level, 700);
});

test("Settlement is idempotent and uses the flown aircraft", () => {
  const s = save.defaultSave();
  s.planes.push("phantom"); s.planeData.phantom = save.defaultPlaneSave(); s.selected = "phantom";
  const first = settleRun(s, result());
  assert.ok(first.save.planeData.falcon.level > 0);
  assert.equal(first.save.planeData.phantom.level, 0);
  const second = settleRun(first.save, result());
  assert.equal(second.duplicate, true);
  assert.deepEqual(second.save, first.save);
  assert.equal(first.save.coins - s.coins, first.result.coins);
});

test("Secret victory unlocks the next planet and its 200-level cap", () => {
  const s = save.defaultSave();
  s.planetProgress["0_0"].maps = 10; s.planeData.falcon.level = 100;
  const settled = settleRun(s, result({ mode: "secret", map: 9, secretDefeated: true }));
  assert.equal(save.isPlanetUnlocked(settled.save, 0, 1), true);
  assert.equal(save.levelCap(settled.save), 200);
});

test("Daily bonuses pay only newly earned stars, using the launch date", () => {
  const s = save.defaultSave();
  const day = makeDaily("2026-01-12");
  const first = settleRun(s, result({ mode: "daily", dailyId: day.id, stars: 1 }));
  assert.equal(first.result.rewards.daily.coins, day.reward.coins);
  const replay = settleRun(first.save, result({ runId: "day-repeat", mode: "daily", dailyId: day.id, stars: 1 }));
  assert.deepEqual(replay.result.rewards.daily, emptyReward());
  const improved = settleRun(replay.save, result({ runId: "day-improved", mode: "daily", dailyId: day.id, stars: 3 }));
  assert.equal(improved.result.rewards.daily.coins, day.reward.coins * 2);
  const failed = settleRun(s, result({ mode: "daily", dailyId: day.id, stars: 0 }));
  assert.equal(failed.save.daily.done, false);
  assert.equal(first.save.daily.key, day.id);
});

test("Old saves preserve currency, upgrades and cleared-sector access", () => {
  storage.clear();
  const old = save.defaultSave(); old.version = 2;
  delete old.settings.language;
  old.coins = 43210; old.planeData.falcon.level = 20;
  old.planetProgress["0_0"] = { maps: 7, stars: [3, 2, 1], secret: false };
  storage.set("skyfront_ace_save_v2", JSON.stringify(old));
  const migrated = save.loadGame();
  assert.equal(migrated.version, 3);
  assert.equal(migrated.settings.language, "es");
  assert.equal(migrated.coins, 43210);
  assert.ok(migrated.planeData.falcon.level >= 60);
  assert.equal(save.isMapUnlocked(migrated, 0, 0, 6), true);
  assert.deepEqual(migrated.planetProgress["0_0"].stars, [3, 2, 1]);
});

test("Language saves, reloads and validates corrupt settings", () => {
  for (const language of LANGUAGES) {
    const s = save.defaultSave(); s.settings.language = language.code;
    save.saveGame(s);
    assert.equal(save.loadGame().settings.language, language.code);
  }
  storage.set("skyfront_ace_save_v2", "{broken");
  assert.equal(save.loadGame().settings.language, "es");
});

test("All locales render Settings, including English fallback and placeholders", () => {
  const expected = { es: "AJUSTES DEL SISTEMA", en: "SYSTEM CONFIG", pt: "AJUSTES DO SISTEMA" };
  for (const language of LANGUAGES) {
    const s = save.defaultSave(); s.settings.language = language.code;
    const markup = renderToStaticMarkup(React.createElement(LanguageProvider, { language: language.code, onChange: () => {} },
      React.createElement(Settings, { save: s, set: () => {}, back: () => {}, toast: () => {}, onReset: () => {} })));
    assert.ok(markup.includes(expected[language.code]));
    assert.ok(markup.includes("value=\"es\"") && markup.includes("value=\"en\"") && markup.includes("value=\"pt\""));
    assert.ok(!translate(language.code, "Sector {sector} at aircraft level {level}", { sector: 2, level: 10 }).includes("{"));
    assert.notEqual(translate(language.code, "PROGRESSION RULE"), "PROGRESSION RULE");
  }
  assert.equal(translate("es", "FALCON"), "FALCON");
  assert.equal(translate("es", "EARTH"), "TIERRA");
  assert.equal(translate("pt", "EARTH"), "TERRA");
});

test("Normal progression has attainable ten-level milestones", () => {
  const s = save.defaultSave();
  for (let map = 0; map < 10; map++) {
    let wins = 0;
    const goal = (map + 1) * 10;
    while (s.planeData.falcon.level < goal && wins < 8) {
      const earned = calculateRewards({ ...cfg, map }, "NORMAL", true,
        { coins: 200, crystals: 1, xp: 150 + map * 90 }, wins === 0);
      const plane = s.planeData.falcon;
      Object.assign(plane, advanceAirframe(plane.level, plane.xp, earned.total.xp, 100));
      wins++;
    }
    assert.ok(wins < 8, `Unreasonable XP wall before level ${goal}`);
    assert.ok(s.planeData.falcon.level >= goal);
  }
});

// These engine checks mock the host, not gameplay rules; they are not browser benchmarks.
test("Engine enforces gates, captures difficulty and charges one entry", () => {
  const noop = () => {};
  globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
  globalThis.requestAnimationFrame = () => 0;
  globalThis.cancelAnimationFrame = noop;
  const canvas = {
    getContext: () => ({ setTransform: noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 720 }),
    addEventListener: noop, removeEventListener: noop, width: 0, height: 0,
  };
  const { GameEngine } = require("../src/game/engine.ts");
  const s = save.defaultSave();
  let paid = 0;
  let final;
  const engine = new GameEngine(canvas, s, { onHud: noop, onEnd: (value) => { final = value; }, onEvent: (event) => { if (event === "entryPaid") paid++; } });
  assert.equal(engine.startRun({ ...cfg, map: 1 }), false);
  assert.equal(engine.running, false);
  assert.equal(engine.startRun({ ...cfg, difficulty: "HARD" }), true);
  engine.save = { ...engine.save, settings: { ...engine.save.settings, difficulty: "EASY" } };
  engine.endRun(false);
  assert.equal(final.difficulty, "HARD");
  assert.equal(final.planeId, "falcon");
  assert.equal(final.rewards.coinMultiplier, DIFFICULTY.HARD.reward);

  engine.save.planetProgress["0_0"].maps = 10;
  engine.save.planeData.falcon.level = 100;
  engine.save.coins = 20000;
  engine.save.crystals = 10;
  assert.equal(engine.startRun({ ...cfg, mode: "secret", map: 9 }), true);
  assert.equal(engine.save.coins, 0);
  assert.equal(engine.save.crystals, 0);
  assert.equal(paid, 1);
  assert.equal(engine.startRun({ ...cfg, mode: "secret", map: 9 }), false);
  assert.equal(paid, 1);

  engine.useEvade();
  assert.equal(engine.player.evadeCd, 30);
  engine.setPaused(true);
  engine.update(1, 1);
  assert.equal(engine.player.evadeCd, 30);
  engine.setPaused(false);
  engine.update(0.01, 1);
  assert.equal(engine.player.evadeCd, 29);
  assert.equal(engine.fx.localize("SHIELD"), "ESCUDO");
  engine.save.settings.language = "en";
  assert.equal(engine.fx.localize("SHIELD"), "SHIELD");
  engine.destroy();
});

const accounts = require("../src/account/index.ts");
const tokens = require("../src/account/token.ts");
const googleAccount = { kind: "google", id: "1234567890", name: "Ada", since: 1 };
const makeToken = (claims) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(claims)}.signature`;
};
const validClaims = (overrides = {}) => ({
  iss: "https://accounts.google.com", sub: "1234567890", aud: "client-abc",
  exp: Math.floor(Date.now() / 1000) + 3600, name: "Ada Lovelace", email: "ada@example.com", ...overrides,
});

test("Guest keeps the original key so existing progress survives the update", () => {
  storage.clear();
  const legacy = save.defaultSave();
  legacy.coins = 9876;
  storage.set("skyfront_ace_save_v2", JSON.stringify(legacy));
  save.setActiveProfile(accounts.profileFor({ kind: "guest", id: "guest" }));
  assert.equal(save.getActiveProfile(), "");
  assert.equal(save.loadGame().coins, 9876);
});

test("Each account gets an isolated save slot", () => {
  storage.clear();
  save.setActiveProfile("");
  const guest = save.defaultSave(); guest.coins = 100; save.saveGame(guest);
  save.setActiveProfile(accounts.profileFor(googleAccount));
  const signedIn = save.defaultSave(); signedIn.coins = 777; save.saveGame(signedIn);
  assert.equal(save.loadGame().coins, 777);
  save.setActiveProfile("");
  assert.equal(save.loadGame().coins, 100);
  assert.notEqual(accounts.profileFor(googleAccount), "");
});

test("Reset clears only the active profile", () => {
  storage.clear();
  save.setActiveProfile("");
  const guest = save.defaultSave(); guest.coins = 4242; save.saveGame(guest);
  const profile = accounts.profileFor(googleAccount);
  save.setActiveProfile(profile);
  const signedIn = save.defaultSave(); signedIn.coins = 555; save.saveGame(signedIn);
  save.resetGame();
  assert.equal(save.hasSave(profile), false);
  save.setActiveProfile("");
  assert.equal(save.loadGame().coins, 4242, "resetting an account must not wipe guest progress");
  save.resetGame();
  assert.equal(save.hasSave(""), false);
});

test("Account records round-trip and reject corrupt data", () => {
  storage.clear();
  assert.equal(accounts.loadAccount(), null);
  accounts.storeAccount(googleAccount);
  assert.equal(accounts.loadAccount().id, "1234567890");
  accounts.storeAccount({ ...accounts.GUEST, since: Date.now() });
  assert.equal(accounts.loadAccount().kind, "guest");
  storage.set("skyfront_ace_account_v1", "{not json");
  assert.equal(accounts.loadAccount(), null);
  storage.set("skyfront_ace_account_v1", JSON.stringify({ kind: "google" }));
  assert.equal(accounts.loadAccount(), null, "a Google record without an id must be rejected");
  accounts.storeAccount(null);
  assert.equal(accounts.loadAccount(), null);
});

test("Google tokens are only accepted when the basic claims match", () => {
  const now = Date.now();
  const ok = tokens.profileFromToken(makeToken(validClaims()), "client-abc", now);
  assert.equal(ok.sub, "1234567890");
  assert.equal(ok.name, "Ada Lovelace");
  for (const bad of [
    validClaims({ aud: "someone-else" }),
    validClaims({ iss: "https://evil.example" }),
    validClaims({ exp: Math.floor(now / 1000) - 10 }),
    validClaims({ sub: "" }),
  ]) {
    assert.equal(tokens.profileFromToken(makeToken(bad), "client-abc", now), null);
  }
  assert.equal(tokens.profileFromToken("garbage", "client-abc", now), null);
  assert.equal(tokens.profileFromToken(makeToken(validClaims()), "", now), null);
  // Non-ASCII display names must survive base64url decoding.
  const accented = tokens.profileFromToken(makeToken(validClaims({ name: "Aitana Muñoz 航" })), "client-abc", now);
  assert.equal(accented.name, "Aitana Muñoz 航");
  // Falls back to the email when Google omits a display name.
  assert.equal(tokens.profileFromToken(makeToken(validClaims({ name: "" })), "client-abc", now).name, "ada@example.com");
});

test("Sign-in is optional: no gate module remains and the dialog is user-invoked", () => {
  const accountUi = require("../src/ui/Account.tsx");
  assert.equal(accountUi.AccountGate, undefined, "the forced first-run gate must be gone");
  assert.equal(typeof accountUi.SignInDialog, "function");
  // The app must not render any blocking gate when no account is stored.
  const appSource = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
  assert.ok(!appSource.includes("AccountGate"), "App.tsx must not mount a forced gate");
  assert.match(appSource, /signInOpen && .*SignInDialog/s, "dialog renders only from user-toggled state");
  assert.ok(!/signInOpen\s*=\s*useState\(\s*true/.test(appSource), "dialog must start closed");
});

test("Account screens render in every language", () => {
  const { SignInDialog, AccountPanel, ImportPrompt } = require("../src/ui/Account.tsx");
  const expectCancel = { es: "CANCELAR", en: "CANCEL", pt: "CANCELAR" };
  for (const language of LANGUAGES) {
    const wrap = (node) => renderToStaticMarkup(
      React.createElement(LanguageProvider, { language: language.code, onChange: () => {} }, node));
    const dialog = wrap(React.createElement(SignInDialog, { onGoogle: () => {}, onClose: () => {} }));
    assert.ok(dialog.includes(expectCancel[language.code]), "the dialog must always be dismissible");
    assert.ok(!dialog.includes("SIGN IN EXPLAINER"), "long-form copy must resolve, not leak its key");
    assert.ok(!dialog.includes("LOCAL ONLY WARNING"));
    const panel = wrap(React.createElement(AccountPanel, {
      account: googleAccount, hasProgress: true,
      onClose: () => {}, onSignOut: () => {}, onSwitch: () => {}, onReset: () => {},
    }));
    assert.ok(panel.includes("Ada"));
    assert.ok(!panel.includes("RESET WARNING"));
    assert.ok(wrap(React.createElement(ImportPrompt, { onImport: () => {}, onSkip: () => {} })).length > 0);
  }
  // Production Client ID is embedded, so Google sign-in works without a Netlify variable.
  const google = require("../src/account/google.ts");
  assert.equal(google.configuredClientId(), google.DEFAULT_CLIENT_ID);
  assert.match(google.DEFAULT_CLIENT_ID, /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
  // Tokens for the real production client are accepted; other audiences are not.
  assert.ok(tokens.profileFromToken(makeToken(validClaims({ aud: google.DEFAULT_CLIENT_ID })), google.DEFAULT_CLIENT_ID));
  assert.equal(tokens.profileFromToken(makeToken(validClaims({ aud: "client-abc" })), google.DEFAULT_CLIENT_ID), null);
});

test("Language and account choice persist independently of progress", () => {
  storage.clear();
  save.setActiveProfile("");
  const s = save.defaultSave(); s.settings.language = "pt"; s.coins = 1;
  save.saveGame(s);
  accounts.storeAccount(googleAccount);
  save.setActiveProfile(accounts.profileFor(accounts.loadAccount()));
  assert.equal(save.loadGame().settings.language, "es", "a new profile starts with defaults");
  save.setActiveProfile("");
  assert.equal(save.loadGame().settings.language, "pt");
});

console.log(`\n${checks} checks passed. TypeScript checked. No browser/GPU performance claims are made by this suite.`);