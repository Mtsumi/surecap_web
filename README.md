# surecap_web

Next.js applicant intake for SureCap (Section 1).

**Backend API:** [surecap-backend](https://github.com/Mtsumi/surecap_dossier_search) (separate repo)

## Flow

1. Open `/apply` (or scan QR pointing here)
2. Pick building → apartment → confirm
3. Draft application saved via API

Optional query: `/apply?building=1` to pre-select a building.

## Setup

```bash
npm install
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Open [http://localhost:3000/apply](http://localhost:3000/apply)

## Deploy (Vercel)

1. Import this repo on [Vercel](https://vercel.com)
2. Set env `NEXT_PUBLIC_API_URL` to your deployed API URL
3. Add that Vercel URL to backend `CORS_ORIGINS`

## Language

Uses browser language (`fr` / `en`) with a manual toggle. No backend storage.
