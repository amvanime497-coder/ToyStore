# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Server / Supabase setup

The project includes a small Express auth server at `server.js` which can talk to Supabase via the JavaScript client and optionally connect directly to Postgres using `pg` (recommended for server-side operations).

Steps to connect your Supabase project and run the server locally:

- **1. Install dependencies** (use `pnpm` if you use pnpm, otherwise `npm`):

```powershell
pnpm install
# or
npm install
```

- **2. Create a local `.env` file** by copying the example and filling your values (DO NOT commit `.env`):

```powershell
copy .env.example .env
# then open .env in an editor and replace placeholders with your real values
```

	- `DATABASE_URL` — optional direct Postgres URL (server-side only). Example:
		`postgresql://postgres:<YOUR_PASSWORD>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`
	- `SUPABASE_URL` — your Supabase URL (example: `https://rcphxrqhanmvprgirigs.supabase.co`)
	- `SUPABASE_KEY` — anon key or other server key (do not expose service role to clients)
	- `SUPABASE_SERVICE_ROLE_KEY` — optional service role key for server admin actions (keep strictly server-side)
	- `USE_PG` — set to `true` when you want the server to use `pg` and `DATABASE_URL`

- **3. Run the server:**

```powershell
npm run start-server
# or if you use pnpm: pnpm run start-server
```

- **4. Test connectivity**

	- Health check:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

	- Test direct Postgres connection (requires `DATABASE_URL` and `USE_PG=true`):

```powershell
Invoke-RestMethod http://localhost:3001/dbtest
```

Notes and safety:
- Never commit `.env` containing your DB password or Supabase service role key.
- The repo includes `.env.example` as a reference only.
- The server contains a small safety measure that disables TLS verification when connecting to Supabase poolers for local development. This is insecure and should be disabled in production.

If you want, I can help you create a `.env` locally (without committing it) or walk through enabling `USE_PG` and testing `GET /dbtest`.

## Deployment & Environment Variables (summary)

If you deploy the frontend (Vite) separately from the backend, or on a platform
like Vercel, make sure environment variables are configured correctly before
building. Common issues (and fixes) are listed below.

- Public (client) environment variables:
	- Prefix with `VITE_` (e.g. `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
	- These values are embedded into the built JavaScript and are visible to
		anyone who inspects the bundle. Only put non-secret values here.

- Server-only (secret) environment variables:
	- Do NOT prefix with `VITE_` (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`).
	- These must be set as server environment variables in your hosting provider
		(Vercel Project Settings → Environment Variables) and must NOT be exposed
		to the client.

- Common deployment failure: "Failed to fetch" on login/register
	- Cause: frontend was built with no `VITE_API_URL`, so it fell back to
		`http://localhost:3001`. When opened from another device the browser
		cannot reach localhost on the developer machine.
	- Fix: Set `VITE_API_URL` in the hosting environment (or change the client
		to use relative `/api` paths and deploy the server as serverless functions).
	- After changing environment variables in Vercel, redeploy the project so the
		new values are embedded into the build.

- Security checklist before deploy:
	- Remove any `VITE_` prefixed variables that contain secrets (service role key,
		database URLs). If such secrets were exposed, rotate them immediately.
	- Keep `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` only in server-side envs.

- Options to deploy on Vercel:
	1) Deploy frontend static site and a separate backend service (set `VITE_API_URL`).
 2) Convert `server.js` into Vercel Serverless Functions inside `api/` so the
		frontend can use relative paths (e.g. `fetch('/login')`). I can help convert
		`server.js` routes into `api/*.js` endpoints.
 3) Use Supabase client directly from the frontend (set `VITE_SUPABASE_URL` and
		`VITE_SUPABASE_ANON_KEY`) for auth operations — no custom backend required,
		but you can't perform privileged admin operations from the client.

If you want, I can add a short checklist or example commands to this README to
help with redeploying on Vercel.
