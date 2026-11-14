# Lean Log

A personal workout, cutting and progress tracker for one person. It runs offline, stores everything on the device, and is built to be used one-handed at the gym.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the pure functions
npm run build      # typecheck + production build with service worker
npm run preview    # serve the production build (needed to test offline/install)
```

To install it on a phone, deploy `dist/` to any static HTTPS host (Netlify, Vercel, GitHub Pages, Cloudflare Pages), open the URL, and choose **Add to Home Screen**. After the first load it works fully offline.

## Screens

- **Today** (default): the date, today's workout from the rotation (no picker), chips for planned cardio and abs, and a progress bar of logged sets. Each exercise shows its target, a "Last: … on Mon 9 Nov" hint (or "Start: 20 kg × 10" before any history), set rows with kg and reps, and a ✎ button to change the exercise, its sets and target, or remove it. **Add exercise** sits under the list. Below that: + Set / − Set / Copy last, a PR badge, Finish workout, a rest timer, the cardio card (HIIT and walk), daily numbers (steps, calories, protein, weight, notes) and an Up next card.
- **Calendar**: a Monday-first month view. Each day shows a CS / BB / LT / OFF tag styled as done, partial, planned or missed, with dots for HIIT done (coral) and steps goal hit (mint). Tap a day to open a detail sheet, then **Open day** for the full editor. Past days can be edited.
- **Progress**: Strength (top set, estimated 1RM or volume per lift, plus workouts per week against a target of 6), Body (weigh-ins, a 7-day average, change since start, weekly rate and a pace chip) and Cardio (14 days of steps and calories, HIIT per week against a target of 2).
- **Plan**: view-only. It lists the next 8 days in rotation order with each day's exercises. Exercises are changed inside a day's workout, not here.
- **Profile**: your 3D gym card, current and best streak, total workouts, this week's count, a new quote every day, and the card ladder. Tap your name to edit what's printed on the card. The gear icon opens **Settings** (daily steps/calorie/protein targets, rest timer, JSON export and import, demo mode).

## Charts

Hover with a mouse, or tap on a phone, to see the details for any point or bar. Tap outside the chart to close it. Keyboard users can focus a chart and use ← → to move between points.
- **Strength:** the date, the value with its unit, every set from that session, sets and volume, and the change since the previous session.
- **Body:** the 7-day average and that day's actual weigh-in.
- **Steps and calories:** the exact number, plus % of goal or how far over/under target.
- **Weekly bars:** the count and how far it is from the target.

## Where workouts are stored

Everything is saved on the person's own phone, in the browser's IndexedDB storage for this app, and nothing is uploaded. Each friend who installs it has completely separate data. A typical day takes about 0.7 KB, so a whole year of training is roughly 250 to 300 KB. **Settings → Storage** shows the live numbers and has a **Protect** button that asks the browser not to evict the data when the phone runs low on space (installed apps usually get this automatically). Clearing site data or uninstalling deletes it, so export a backup now and then.

## Streak and cards

- **Streak** = workouts in a row. Rest days (Tuesday) never break it. Today counts as pending until midnight, so the streak only drops when a past gym day has nothing logged. A skipped day counts like a missed day for the streak.
- **Cards** unlock from your *best* streak, so one missed day never takes a card away:

  | Card | Workouts in a row |
  |---|---|
  | Bronze | start |
  | Silver | 6 (one clean week) |
  | Gold | 24 (four weeks) |
  | Platinum | 48 (two months) |
  | Diamond | 96 (four months) |
  | Apex, the final card | 156 (six months) |

- The card floats, tilts toward your finger or mouse and catches the light. Each tier has its own material: copper, brushed silver, gold, icy platinum with a light sweep, and diamond with prismatic foil and sparks. Apex has an animated rainbow edge, a glowing aura, holographic foil, rising sparks, a glitching color-cycling number, and a full-screen unlock with light rays, a flash and confetti. Apex stays hidden as "???" until you earn it.
- When you earn a new card, the unlock animation plays once, wherever you are in the app.
- In dev mode (`npm run dev`) you can tap any card in the list to preview it, and use the buttons under the list to replay each unlock animation. The installed app hides both.
- The quote of the day is chosen by date. It stays the same all day and doesn't repeat until all 60 quotes have been shown.
- The card is a physical object, so it's the one place that uses metallic gradients. The rest of the UI still has none. Animations stop under `prefers-reduced-motion`.

## Project layout

```
src/lib/       types, date helpers, program (exercises, templates, schedule),
               calc (pure math), logs (record helpers), db (Dexie), backup,
               sample (demo data), store (React context), router
src/screens/   Today (+ ExerciseBlock), Calendar, Progress, Plan, Settings
src/components Icon (custom line icons), ui primitives, charts (SVG), RestTimer
scripts/       make-icons.mjs creates the PNG app icons with no dependencies
```

## Decisions I made

**Stack**
- React 18, TypeScript (strict, `noUncheckedIndexedAccess`, no `any`), Vite 5 and Tailwind 3.
- I drew the charts by hand in SVG instead of using Recharts. That keeps the bundle small and lets the charts share the design tokens exactly: faint grid, area fill, emphasized last point.
- Dexie 4 over IndexedDB. The whole log (a few hundred small records a year) is loaded into memory at startup, and every edit is written to IndexedDB immediately, so screens never wait on storage.
- Hash routing (`#/day/2026-11-09`), so deep links work on any static host with no server rewrites.
- `vite-plugin-pwa` (Workbox) precaches the app shell and fonts and updates automatically. The fonts (Inter Variable and Barlow Condensed 500/600/700, Latin only) are self-hosted so they work offline. The precache is about 470 KB.

**Data**
- One `LogDay` per date, matching the spec, plus `Settings`. A record is created only when something is entered. If you clear a day back to its defaults, the record is deleted.
- Set rows you never touched are not stored. A day's set count is the stored array length, or the template's set count if nothing is stored.
- Exercise IDs are shared across A and B days. Lateral raise, face pull, incline DB press, wrist curl and reverse wrist curl keep one history wherever they appear.
- Timed exercises (plank, farmer's carry, dead hang) store seconds in `r`. Farmer's carry also takes kg.
- **Rotation:** gym days cycle CS-A → BB-A → LT-A → CS-B → BB-B → LT-B and repeat, and Tuesday is always closed. It starts as CS-A on the first day anything was logged (saved as `Settings.rotationStart`). It is **progress-based**: a day you train keeps its workout for good; a gym day you **miss** doesn't move the rotation, so the same workout waits for you next time (the day screen says "You missed BB-A on Fri 13 Nov"); **Skip** on a day moves the rotation on without training it (undoable). Future days are projected as if you train every gym day from today, so the Calendar and Plan always match. Abs and cardio belong to the workout (abs on CS-A, LT-A, BB-B; HIIT on CS days; incline walk on BB days). Days before the start are never counted as missed. Data from older versions is re-labelled by date once on first load (`Settings.scheduleVersion`).
- `Settings` also stores `restTimer` (on/off) and `restSeconds` (default 90).
- Goal weight, start weight and height were removed from the UI on request. "Since start" on the Body tab now measures from your first weigh-in, and the third stat shows your lowest weigh-in. The old fields stay in the data model so older backups still import.

**Logging behaviour**
- A set counts as logged once reps (or seconds) are entered. If you enter reps with no weight, the weight from the placeholder is filled in, the way you would copy it on a paper log.
- Copy last replaces that exercise's rows with the last session's sets.
- The rest timer starts when a set first becomes logged. It has −15 / +15 / dismiss controls and vibrates when time is up, where the device supports it.
- **PR**: the best Epley e1RM of this session is strictly higher than every earlier session of that exercise. A first-ever session is not a PR, because there is nothing to beat yet. Timed holds don't get PR badges.
- Finish workout marks the day as done and shows sets, volume and the number of PRs. Reopen undoes it.
- Day status: **done** = finished, **partial** = sets logged but not finished, **planned** = today or a future day, **missed** = a past gym day with nothing logged.
- A workout for the weekly count is any non-rest day with logged sets or marked done.

**Math** (`src/lib/calc.ts`, tested in `calc.test.ts`)
- Epley e1RM = w × (1 + r/30), and r = 1 returns w.
- Volume = Σ kg × reps over logged, weighted sets.
- The 7-day moving average is the mean of the weigh-ins in the 7 calendar days ending on each weigh-in. It does not fill gaps.
- Weekly rate is a least-squares slope over the last 21 days of weigh-ins, × 7. It needs at least 3 weigh-ins spanning 5 or more days.
- Pace uses the rate of loss: under 0.3 kg/week = slow, 0.3 to 1 = on pace, over 1 = fast (with a warning to watch your lifts). A rising trend shows "Gaining".

**Design**
- Dark first, with a full light theme that follows the system setting. Every color is an RGB token in `src/index.css`. There is one accent (sky blue), plus coral for HIIT, mint for steps and amber for calories. All text tokens meet 4.5:1 contrast on their backgrounds in both themes.
- The Today screen is a logbook: exercises are separated by hairlines, not boxed. Cards are used only for grouped inputs (cardio, daily numbers).
- Inputs are 44 to 48 px tall. The tab bar respects the safe area. The layout is a centered 720 px column on desktop.
- Motion is limited to progress bars, sheet entry and toggle switches, and it is all turned off under `prefers-reduced-motion`.
- Every input, toggle and chart has an accessible name. Each chart also includes a screen-reader-only data table.

**Demo mode**
- Demo data lives in a separate IndexedDB database (`lean-log-demo`). Real data (`lean-log`) is never read from or written to while demo mode is on. Turning demo on generates a fresh 10-week sample, and turning it off returns you to your own data. Export and import act on whichever database is active.
- The app ships with your settings only. It contains no fake logs.

**Program edits**
- Edits are made with the ✎ button inside a day's workout and apply to that workout from then on (e.g. every Back A day). Changing an exercise moves any sets already entered that day to the new exercise. Edits are saved as overrides in `Settings.program`, keyed by workout (`CS-A` … `LT-B`, plus `ABS`), and user-made exercises go in `Settings.customExercises`. Any block you haven't edited keeps using the built-in default, and both fields are included in backups.
- Editing a workout changes it for every day that uses it. Sets already logged are never deleted. If a past day has sets for an exercise that has since been removed from the plan, they appear under "Also logged" on that day.

## Testing notes

- `npm test` runs 49 unit tests: e1RM, volume, top set, PR detection, moving average, weekly rate and pace, schedule, day status, per-week counts, backup round-trip/validation, plus streak rules, tier thresholds, the daily quote rotation, and program overrides, custom exercises and their backup validation, and the rotation schedule.
- Each milestone was checked in a browser at 390 px wide, and the 720 px desktop column and light theme were checked too. In the production preview, the manifest, the active service worker and the precached fonts were all confirmed.
- I couldn't run Lighthouse in my build environment (headless Chrome wouldn't start in the sandbox). To run it yourself:
  ```bash
  npm run build && npm run preview
  npx lighthouse http://localhost:4173 --form-factor=mobile --view
  ```
  Note: Lighthouse 12 removed the separate "PWA" category. Installability now shows up in Chrome DevTools → Application → Manifest.
