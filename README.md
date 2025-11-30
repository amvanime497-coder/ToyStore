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
