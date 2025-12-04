# Vercel Environment Setup

This project expects several environment variables. Below are the keys to add in the
Vercel Project Settings → Environment Variables panel (or via `vercel env` CLI).

Recommended keys to add (match these names exactly):

- `SUPABASE_URL` — your Supabase Project URL (e.g. `https://<ref>.supabase.co`)
- `SUPABASE_ANON_KEY` — Supabase anon/public API key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side secret)
- `DATABASE_URL` — Postgres connection string (if using server-side Postgres access)
- `VITE_API_URL` — URL to your server API (`https://...`)
- `VITE_ENV` — environment label (e.g. `production`)
- `VITE_PROD_BASE_URL` — frontend base URL in production
- `VITE_DEV_BASE_URL` — frontend base URL for dev
- `VITE_LOGIN_USER_ROUTE`, `VITE_REGISTER_USER_ROUTE`, `VITE_FORGOT_PASSWORD_ROUTE`, `VITE_VERIFY_OTP_ROUTE`, `VITE_RESET_PASSWORD_ROUTE` — route paths used by the frontend

Security notes:
- Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to client-side environment (i.e., do NOT create a `VITE_SUPABASE_SERVICE_ROLE_KEY`). Add the service role key only as a server-side (Production/Preview) secret in Vercel.
- `VITE_` prefixed variables are embedded into the client build and are therefore public.

How to add variables in the Vercel UI:
1. Open your Project in Vercel.
2. Go to Settings → Environment Variables.
3. Click "Add" and enter the Name and Value. Set the Environment (Production/Preview/Development) appropriately.

Optional: add via Vercel CLI (example):
```powershell
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production
```

After adding all required variables, trigger a redeploy in Vercel so the build picks up the new values.
