# Note Time

A small React + Vite + TypeScript PWA for quickly recording what you are doing at the current time.

## Tech stack

- React + Vite + TypeScript
- Firebase Auth and Cloud Firestore
- PWA via `vite-plugin-pwa`
- `date-fns` for date formatting
- `lucide-react` for icons

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in Firebase values before enabling real sync.

```bash
cp .env.example .env.local
```

## Scripts

- `npm run dev` starts the local dev server.
- `npm run build` type-checks and builds the production app.
- `npm run preview` previews the production build locally.
- `npm run lint` runs ESLint.
- `npm run format` formats the project with Prettier.

## Project shape

```text
src/
  app/
  components/
  features/
    auth/
    entries/
    pwa/
    search/
  lib/
    firebase/
    text/
    time/
  styles/
  types/
```
