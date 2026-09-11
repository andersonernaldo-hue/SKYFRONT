# Languages, Aircraft Levels and Rewards

## Language

Spanish, English and Portuguese are available from the main menu, Settings and Pause.
The selected language is stored with the existing local save. New profiles default to
Spanish. Aircraft identifiers, boss callsigns and save keys are never translated.
`src/i18n/` contains the shared React/Canvas dictionary and locale-aware number formatting.

## Sector Access

The **selected aircraft's permanent level**, not the commander level or the in-battle
weapon level, controls access. A prior sector victory is also required.

| Planet order | Sector 1 | Sector 2 | Sector 10 | Secret boss |
| --- | --- | --- | --- | --- |
| Earth | 0 | 10 | 90 | 100 |
| Ocean War | 100 | 110 | 190 | 200 |
| Desert Storm | 200 | 210 | 290 | 300 |
| Neon City, Galaxy 2 | 300 | 310 | 390 | 400 |
| Cryo Bastion | 400 | 410 | 490 | 500 |
| Inferno Core | 500 | 510 | 590 | 600 |
| Final Orbit | 600 | 610 | 690 | 700 |

A secret boss also requires all ten victories and a paid entry for **each attempt**.
Payment happens in `GameEngine.startRun`, after validation, not in a UI button.
Continue, Next, Retry, Restart, daily missions and direct engine launches use the same
rules in `src/game/access.ts`. Continue offers a legal replay when more XP is needed.

Aircraft start at level 0. Their linear XP curve supports all 700 levels. XP goes to
the aircraft that flew the mission. A different aircraft must meet its own level gate.
Old saves keep resources and completed sectors; the previously selected aircraft is
grandfathered to the minimum level needed to replay already completed content.

## Economy

| Difficulty | Credits | XP | Crystal factor |
| --- | --- | --- | --- |
| Easy | 0.85x | 0.90x | 0.85x |
| Normal | 1.00x | 1.00x | 1.00x |
| Hard | 1.45x | 1.30x | 1.25x |
| Insane | 1.90x | 1.60x | 1.50x |

Crystal rewards are rounded down, with a minimum of one when crystals were earned.
Harder modes primarily increase projectile speed and encounter pressure, with smaller
HP increases than the old balance. Difficulty is captured at takeoff.

Combat loot, sector completion and first-clear rewards are computed separately. A first
campaign victory gives an extra 50% of the sector contract plus crystals. Defeat keeps
earned combat loot but gives no completion or first-clear bonus. The XP curve and sector
contract target roughly two ordinary victories per ten levels; actual pace depends on
difficulty, combat performance and equipment bonuses. Bonuses are applied once, rather
than multiplying boss XP twice or deriving progression XP from farmable score effects.

Daily rewards pay only additional stars. A run keeps its original daily date across
midnight. Results show the exact credited totals and the flown aircraft's level gain.
Recent run IDs prevent duplicate result callbacks from awarding twice. Local records
include mode, aircraft and difficulty and can be filtered by mode/difficulty.

## Verification

Run `node scripts/verify.mjs` from the project root. It uses the preinstalled TypeScript
compiler, checks the whole project, and tests access thresholds, migration, rewards,
duplicate settlement, daily claims, save persistence and server-rendered Settings in
all three languages. It does not benchmark a real browser or verify mobile hardware.

Browser checks: change languages and reload; win sector 1 below aircraft level 10;
confirm sector 2 is locked until both requirements are met; switch to a new aircraft;
verify a secret retry asks for payment; verify the results match the wallet delta.