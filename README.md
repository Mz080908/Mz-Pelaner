# Mz Planer

یک اپلیکیشن بهره‌وری شخصی با رابط شیشه‌ای — وظایف، تقویم جلالی/میلادی، عادت‌ها، پومودورو و حالت تمرکز.

A premium personal productivity app: tasks, dual calendar (Jalali/Gregorian), habits, pomodoro and focus mode — in one glass workspace.

## Stack

- Next.js (App Router) + TypeScript strict
- Tailwind CSS 4
- Framer Motion
- Zustand v5 (`useShallow`)
- `jalaali-js` for the Persian calendar
- Vitest for unit tests

## Development

```bash
npm install
npm run dev          # http://localhost:3001
```

```bash
npm test             # unit tests
npm run build        # production build
```

Mobile access during development: `localtunnel --port 3001`.

## Data & storage

- Per-user state in `localStorage` under the `mzplaner.v1` key (export/import JSON from Settings).
- Supabase (PostgreSQL, Frankfurt) for analytics snapshots and reminder relays.
- cron-job.org triggers the reminder endpoint for minute-level Telegram reminders.

## Deploy

Deployed on Vercel at [mz-pelaner.vercel.app](https://mz-pelaner.vercel.app/).

```bash
vercel --prod
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | Quick add |
| `/` | Search |
| `Ctrl/Cmd + K` | Command palette |
| `Space` | Focus mode |
| `Esc` | Close / clear selection |

## License

Private — all rights reserved.
