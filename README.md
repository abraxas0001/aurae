# Aurae

AI-assisted recipe platform: browse recipes by course, save favourites, chat with an AI chef, and find fresh AI-generated recipes every morning.

## Features

- **AI chef**: a multi-turn cooking assistant powered by Gemini 2.5 Flash.
- **Daily recipes**: a scheduled job (node-cron, 06:00 UTC) generates new recipes, files each under the right category and gives it a unique URL.
- **On-demand generation**: create a recipe's content or image with AI.
- **Accounts and favourites**: session sign-in (bcrypt, sessions stored in PostgreSQL) and saved recipes.
- **Server-rendered UI**: Express with EJS templates.

## Tech

Node.js · Express · EJS · PostgreSQL (Supabase) · express-session + connect-pg-simple · bcrypt · Google Gemini · node-cron · Vercel

## Run locally

```bash
npm install
cp .env.example .env   # set DATABASE_URL, SESSION_SECRET, NODE_ENV, GEMINI_API_KEY
npm run seed           # create the tables and sample data
npm run dev            # http://localhost:3000 (or the PORT you set)
```

Deployment notes (Vercel + Supabase): see [DEPLOYMENT.md](DEPLOYMENT.md).
