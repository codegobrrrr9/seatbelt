# Stack notes

Where the secrets go, what is public, and the one thing each stack gets wrong most often.

## Supabase
- **Public:** project URL, anon key (`eyJ… role: anon`), publishable key (`sb_publishable_…`).
- **Server only:** `service_role` JWT, `sb_secret_…`, database password, JWT secret.
- **Most common mistake:** table created in the dashboard or a migration with RLS off. Every table
  in `public` needs `enable row level security` and at least one policy.
- **Second most common:** the service role client imported into a `'use client'` component "to
  make the admin page work". Admin pages call a server route that checks the user's role.
- Edge functions read secrets with `Deno.env.get('NAME')`; set them with `supabase secrets set`.
- Storage buckets need policies too. A public bucket is readable by URL by anyone.

## Firebase
- **Public:** web API key (restrict by HTTP referrer in Google Cloud), project id, app id.
- **Server only:** service account JSON, admin SDK credentials.
- **Most common mistake:** rules left in test mode (`allow read, write: if true` or
  `if request.time < timestamp…`). Test mode rules expire and then everything fails, or worse,
  people extend the date.
- Every `match` block should check `request.auth != null` and ownership on writes.

## Next.js (App Router)
- Anything read through `process.env.NEXT_PUBLIC_*` is inlined into the client bundle.
- Route handlers (`app/**/route.ts`), server actions (`'use server'`), and files that
  `import 'server-only'` are server side. Components are client side when they say `'use client'`
  or are imported by one.
- Middleware can gate whole path prefixes (`/dashboard/*`) but every route handler still needs its
  own check; middleware can be bypassed by misconfiguration.
- `headers()` in `next.config.js` is where CORS usually goes wrong.

## Vite / React / Expo
- `VITE_*`, `REACT_APP_*`, `EXPO_PUBLIC_*` are public. There is no server side in a pure Vite app;
  anything needing a secret needs a backend, edge function, or a service like Supabase with RLS.
- Mobile apps ship their bundle to every user. Treat the whole app as public code.

## Express / Node backends
- `cors()` with no options allows every origin. Pass `{ origin: [...] }`.
- Every router gets an auth middleware before any handler that reads user data:
  `router.use(requireAuth)`.
- Use `helmet()`, and never `app.use(express.static('.'))` from the project root (it serves `.env`).

## Vercel / Netlify / Railway
- Set secrets in the project's environment variables UI, not in `vercel.json` or `netlify.toml`.
- Preview deployments get the same env unless scoped. Keep live keys out of previews.
- Serverless functions under `api/` or `netlify/functions/` are server side.

## Stripe
- `pk_*` public, `sk_*` and `rk_*` server only, `whsec_*` server only.
- Webhooks: verify with `constructEvent` on the raw body. In Next App Router use `await req.text()`;
  in Express, `express.raw({ type: 'application/json' })` on that route only.
- Never trust an amount or plan from the client. Look it up server-side by price id.

## Clerk / Auth0 / NextAuth / Lucia
- Public: publishable key, client id, domain. Server only: secret key, client secret.
- Having auth installed does not protect a route. Each handler still has to call the helper
  (`auth()`, `getServerSession()`, `validateRequest()`) and check the result.

## Postgres via pg / Prisma / Drizzle
- Prisma and Drizzle query builders are parameterized. `prisma.$queryRawUnsafe` and
  `db.execute(sql.raw(...))` with user input are not.
- Connection strings with passwords are secrets (`DATABASE_URL`).
