# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ShareMyShoot ("sharenow") — a photo gallery sharing platform for photographers. Photographers create galleries, upload photos, and share them with clients; clients can view galleries and order prints (via WHCC). Subscriptions are handled through Stripe. Originally scaffolded by Lovable.

The Express upload/API server was **moved out of this repo** into a separate `sharenowapi` repository (commit f577416). Leftovers still reference it: `package.json` scripts (`server`, `server:dev`, `dev:all`) point to a `server.js` that no longer exists, `vitest.config.ts` points to `./server/tests/setup.ts` (also gone), and several root-level `*_GUIDE.md`/`*_SUMMARY.md` docs describe the old monorepo layout. Treat those as stale.

## Commands

```sh
npm run dev        # Vite dev server on port 8080; proxies /api/* to localhost:3001 (run sharenowapi separately)
npm run build      # production build to dist/
npm run lint       # eslint .
npx tsc --noEmit   # type check (CI runs this; there is no npm script for it)
```

There is no working test suite in this repo — vitest config references the removed server tests.

Supabase CLI is used for the backend (`supabase/config.toml`); edge functions deploy with `supabase functions deploy <name>`.

## Architecture

**Stack:** Vite + React 18 + TypeScript, shadcn/ui (Radix + Tailwind), TanStack Query, React Router v6, Supabase (auth + Postgres), Cloudflare R2 (photo storage).

**Three backends the frontend talks to:**
1. **Supabase** — auth and database, via the client in `src/integrations/supabase/client.ts` (generated file, do not edit; `types.ts` is the generated DB schema). Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. **Supabase Edge Functions** (`supabase/functions/`) — R2 presigned URLs/deletes/stats, Stripe checkout + customer portal + subscription checks + webhook, WHCC print orders/pricing/product sync/webhook. Edge functions need secrets set via `supabase secrets set`: Cloudflare R2 (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`), and Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). Do NOT try to do image processing in an edge function — a 24MP photo exceeds the compute limits (`WORKER_RESOURCE_LIMIT`); that's why resizing happens in the browser.
3. **External Express API** (the `sharenowapi` repo) — now only used for Dropbox/Google Drive folder import, external-photo downloads, and integration settings. Reached through `getApiUrl()` in `src/lib/api.ts`. In dev the Vite proxy forwards `/api/*` to `localhost:3001`; in production `VITE_API_URL` points at the deployed server.

**Uploads** run entirely in the browser (`uploadPhoto()` in `src/lib/upload.ts`): canvas resizes the photo to `-lg.webp` (2000px), `-md.webp` (1200px), and `-sm.webp` (300px cover crop) variants (JPEG-encoded under `.webp` names on Safari, which can't encode WebP — R2 serves the stored Content-Type), then the original + 3 variants are PUT directly to R2 via the `r2-presigned-url` edge function, and the photo row is inserted with supabase-js. Keys live under `gallerySlug/sectionTitle/photoId/`. `src/lib/images.ts` (`getResponsiveUrls`) and the delete logic in `PhotoUploader.tsx` both depend on this naming — keep all three in sync. The R2 bucket has CORS rules allowing browser PUTs (configured in Cloudflare).

**Photos** live in R2 and are served from the public bucket URL (`VITE_R2_PUBLIC_URL`, see `src/lib/r2.ts`).

**Routing** (`src/App.tsx`): public routes are `/`, `/pricing`, `/auth`, and the client-facing `/gallery/:slug`; everything else (`/dashboard`, `/manage/:id`, `/store`, `/print-orders`, `/settings`, `/subscription`) is wrapped in `ProtectedRoute`.

**Data fetching** is centralized in TanStack Query hooks under `src/hooks/` (`use-galleries`, `use-gallery-data`, `use-products`, `use-orders`) — add new server state there rather than fetching in components.

**Path alias:** `@/` → `src/`.

**DB migrations** live in `supabase/migrations/`; `database/migrations.sql` and `supabase/consolidated_schema.sql` are consolidated snapshots.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and rsyncs `dist/` to Hostinger on push to `main` (deploys to the `test` subdomain by default; manual dispatch with `subs: prod` deploys the main site). CI runs lint and `tsc --noEmit` — keep both clean.
