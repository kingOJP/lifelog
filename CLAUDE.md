# LiftLog — Claude Context

## Project goal

LiftLog is a Progressive Web App for tracking a 4-day bodybuilding split, installable on iPhone via "Add to Home Screen." The user is a first-time web app developer. The app lives at this repo and auto-deploys to Cloudflare Pages on push to `main`.

Long-term milestones (roughly):
1. ✅ PWA shell + Cloudflare deployment
2. ✅ Dashboard with 4 day cards, week date range
3. ✅ Workout logging + IndexedDB persistence
4. ✅ Recommended weights (progressive overload) + inline set editing
5. ✅ History view + session editing
6. ✅ Day/exercise editing (add, remove, rename exercises per day)
7. ⬜ Rest timer
8. ⬜ Progress charts (Recharts is already installed)
9. ⬜ Week-over-week volume/weight trend metrics

---

## Stack

- **React + Vite + TypeScript** — `npm run dev` to start, `npm run build` to build
- **IndexedDB** — via a custom `idbReq<T>` promise wrapper in `src/db/database.ts` (no third-party library). Read and write in **separate transactions** to avoid IDB auto-commit bugs.
- **localStorage** — for program config (`liftlog_program`) and exercise library (`liftlog_exercises`). Managed in `src/data/programStore.ts`.
- **Plain CSS** — no CSS framework, dark theme via CSS custom properties
- **Recharts** — installed but not yet used
- **Cloudflare Pages** — auto-deploys from GitHub `main` branch

---

## TypeScript rule — CRITICAL

`tsconfig.app.json` has `verbatimModuleSyntax: true`. This means **all interface/type-only imports must use `import type`**:

```ts
import type { WorkoutDay } from '../data/program';   // ✅
import { WorkoutDay } from '../data/program';         // ❌ crashes at runtime in the browser
```

Value imports are fine as normal: `import { PROGRAM, getWeekNumber } from '../data/program'`.

---

## Design tokens (src/index.css)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0f0f12` | Page background |
| `--bg-card` | `#1a1a1e` | Card backgrounds |
| `--bg-input` | `#1a1a1e` | Input backgrounds |
| `--border` | `#2a2a30` | Borders |
| `--text` | `#f0f0f4` | Primary text |
| `--text-muted` | `#888891` | Secondary text |
| `--purple` | `#7C72E8` | Accent / primary action |
| `--green` | `#1D9E75` | Success / done state |
| `--red` | `#E85555` | Destructive actions |

---

## iPhone PWA safe area

All sticky headers use: `padding-top: calc(14px + env(safe-area-inset-top))`
Bottom bars use: `padding-bottom: calc(12px + env(safe-area-inset-bottom))`
Scrollable lists add: `padding-bottom: calc(96px + env(safe-area-inset-bottom))`

All inputs use `font-size: 16px` to prevent iOS Safari zoom-on-focus.

---

## Navigation

No router — pure React state in `App.tsx`. The `View` discriminated union:

```ts
type View =
  | { screen: 'dashboard' }
  | { screen: 'workout'; dayId: number }
  | { screen: 'history' }
  | { screen: 'edit-session'; sessionId: number; dayId: number }
  | { screen: 'edit-day'; dayId: number };
```

`program: WorkoutDay[]` state lives in `App.tsx`, initialized from `getStoredProgram()` (localStorage). On day edits it's updated and saved back.

---

## File map

```
src/
  App.tsx                      — root state, navigation, program state
  App.css                      — app shell, header safe area
  index.css                    — CSS custom properties, global reset

  data/
    program.ts                 — Exercise/WorkoutDay interfaces, PROGRAM (4 days),
                                  RETIRED_EXERCISES, PROGRAM_START, getWeekNumber(),
                                  getWeekDateRange(), getExerciseName()
    programStore.ts            — localStorage CRUD: getStoredProgram, saveStoredProgram,
                                  getExerciseLibrary, addToExerciseLibrary, getExerciseName,
                                  generateExerciseId
    recommendations.ts         — calculateRecommendedWeight(sets, exercise) → number | null

  db/
    database.ts                — all IndexedDB logic (3 stores: sessions, setLogs, exerciseLogs)

  components/
    Dashboard.tsx/css          — 4 day cards + week header + history button
    DayCard.tsx/css            — single day card with Edit button
    WorkoutView.tsx/css        — workout logging + edit-session mode + recommended weights
    ExerciseCard.tsx/css       — per-exercise card: set logging, tap-to-edit sets
    HistoryView.tsx/css        — all past sessions in reverse chronological order
    DayEditView.tsx/css        — edit a day's muscle group label + add/remove exercises
```

---

## IndexedDB schema (version 1)

**`sessions`** — index: `weekNumber`
- `id` (autoincrement), `dayId`, `weekNumber`, `startedAt`, `completedAt?`

**`setLogs`** — index: `sessionId`
- `id`, `sessionId`, `exerciseId`, `setNumber`, `weight`, `reps`

**`exerciseLogs`** — index: `sessionId` (stores difficulty ratings — feature was removed but store still exists)
- `id`, `sessionId`, `exerciseId`, `difficulty`

Key exported functions: `createSession`, `completeSession`, `addSetLog`, `getCompletedSessionsForWeek`, `getAllCompletedSessions`, `getSetLogsForSession`, `getLastCompletedSessionForDay`, `deleteSetLogsForSession`.

---

## Progressive overload algorithm (`src/data/recommendations.ts`)

Runs when opening a new (non-edit) workout. Looks up the last completed session for that day and scores it on three signals (each worth ±⅓ of ±8%):

| Signal | Positive (+⅓) | Neutral (0) | Negative (−⅓) |
|---|---|---|---|
| Avg reps vs range | Above `repHigh` | Within range | Below `repLow` |
| Weight trend | Last set > first set | Flat | Last set < first set |
| Set count | More than `exercise.sets` | Equal | Fewer |

`recommendedWeight = round(avgLastWeight × (1 + score × 0.08), nearest 5 lbs)`

Result pre-populates the weight input in ExerciseCard (via `useEffect` that only fills if the field is still empty).

---

## Decisions & things to keep in mind

- **DB writes only at "Finish Workout"** — sets are pure React state until save. This makes inline editing/deletion free (no DB rollback needed).
- **Edit session flow** — "Edit Session" in history opens WorkoutView with `existingSessionId`. On save it deletes all old set logs for that session and re-writes them.
- **Exercise library never deletes** — removing an exercise from a day keeps it in the localStorage library so history can still resolve the name by ID.
- **Difficulty rating was removed** — the Easy/Medium/Hard buttons were removed as too bulky. The `exerciseLogs` IDB store still exists but nothing writes to it.
- **`PROGRAM_START`** is hardcoded as `2026-06-09` in `program.ts`. The user wants to make this configurable later.
- **`e.stopPropagation()`** is used on nested buttons (Edit, ×) inside tappable cards to prevent triggering parent onClick.
- **White screen with no terminal error** after adding new files = Vite HMR confusion. Fix: hard refresh (`Ctrl+Shift+R`) + restart dev server.
