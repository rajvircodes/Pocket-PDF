# Pocket PDF

Fast, private document utilities built with React, Express and TypeScript.

## Run locally

1. `npm install`
2. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` when Prisma persistence is desired.
3. `npm run dev`

The web app runs on http://localhost:5173 and the API on http://localhost:4000. LibreOffice, qpdf and Ghostscript are optional native dependencies used by advanced conversion paths.
