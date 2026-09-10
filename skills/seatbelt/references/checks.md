# Every seatbelt check, what it means, and the fix

Read the section for a check id when the scanner reports it and the one-line fix is not enough.
Severity: **critical** means someone can take data or money right now. **high** means a
determined person can. **medium** is hygiene that leads to the other two.

## Secrets in code

### S01 OpenAI / Anthropic style key (`sk-…`, `sk-proj-…`, `sk-ant-…`) — critical
Anyone who reads the code, the git history, or the browser bundle can use the key and you pay.
Fix: `.env` → `OPENAI_API_KEY=…`, code reads `process.env.OPENAI_API_KEY`, only from server code.
Then rotate the key in the provider dashboard. Rotating is not optional if it was ever committed.

### S02 Stripe live secret (`sk_live_…`, `rk_live_…`) — critical
Full control of your Stripe account. Fix: move to `STRIPE_SECRET_KEY`, roll the key in
Stripe → Developers → API keys. Publishable keys (`pk_live_…`) are fine in the browser.

### S03 AWS access key (`AKIA…`) — critical
Fix: move both the access key id and the secret to env vars, then deactivate the key in IAM and
create a new one. Consider an IAM role instead of long-lived keys.

### S04 Google API key (`AIza…`) — critical
Firebase web API keys are meant to be public, but only if the key is restricted to your domains
(Google Cloud → Credentials → key → Application restrictions). Any other Google key (Maps server,
Gemini, Cloud) goes to `.env`.

### S05 GitHub token (`ghp_…`, `gho_…`, `ghs_…`) — critical
Fix: move to `.env`, revoke at github.com/settings/tokens, create a fine-grained token with the
minimum scopes.

### S06 Slack token (`xoxb-…`, `xoxp-…`) — critical
Fix: move to `.env`, regenerate under the app's OAuth settings.

### S07 Supabase `service_role` JWT or `sb_secret_…` key — critical
This key ignores every row level security policy. With it, anyone can read, change or delete every
row in every table. Fix: `.env` → `SUPABASE_SERVICE_ROLE_KEY`, read it only in server code (API
routes, server actions, edge functions), never in a component. Rotate in Supabase → Settings → API.

### S08 Private key block (`-----BEGIN … PRIVATE KEY-----`) — critical
Fix: delete from the repo, load from an env var (`JWT_PRIVATE_KEY`, with `\n` escapes) or a secret
file that is not in git. Generate a new key pair; the old one is burned.

### S09 Hardcoded `password:`, `apiKey:`, `secret:`, `token:` value — high
The generic catch for anything the specific checks missed. Fix: same as above, env var + rotate.
If the value really is not secret (a public demo password, a label), add `// seatbelt-ignore` on
that line.

## Repo hygiene

### R01 `.env` exists and `.gitignore` does not ignore it — critical
GitHub is scanned by bots within minutes of a push. Fix: add
```
.env
.env.*
!.env.example
```
to `.gitignore`. If `.env` was ever committed, run `git rm --cached .env`, commit, and rotate
every key inside it. Removing it from history is not enough; the keys are already copied.

### R02 No `.env.example` — medium
Fix: copy `.env` to `.env.example` and replace every value with a placeholder.

## Database

### D01 `service_role` referenced from client-side code — critical
Files with `'use client'`, under `public/`, or not in a server directory that mention
`SUPABASE_SERVICE_ROLE_KEY`, `'service_role'` or `sb_secret_`. Fix: move the code to a route
handler, server action, or edge function. If the file really is server-only, add
`import 'server-only'` (Next), `'use server'`, or a `// seatbelt: server-only` comment.

### D02 Private key under a public env prefix — critical
`NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`, `NUXT_PUBLIC_`, `PUBLIC_` variables are
inlined into the browser bundle at build time. A `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is a
public service role key. Fix: rename without the prefix, and only read it on the server.

### D03 Table created without row level security — critical
Supabase exposes every table through the API using the anon key. Without RLS, `select * from
posts` returns every user's posts to every visitor. Fix, for each table:
```sql
alter table posts enable row level security;
create policy "read own"   on posts for select using (auth.uid() = user_id);
create policy "insert own" on posts for insert with check (auth.uid() = user_id);
create policy "update own" on posts for update using (auth.uid() = user_id);
create policy "delete own" on posts for delete using (auth.uid() = user_id);
```
Public-read tables get `for select using (true)` and owner-only writes. Enabling RLS with no
policies blocks everything, which is safe but will break the app until policies exist.

### D04 Firebase rules open to everyone — critical
`allow read, write: if true;` or `".read": true`. Fix:
```
match /posts/{id} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
}
```

## Web

### W01 CORS allows any origin — high (worse with credentials)
`Access-Control-Allow-Origin: *`, `origin: '*'`, `origin: true`, or bare `cors()`. Fix: list your
own domains, `origin: ['https://myapp.com']`. Never combine `*` with `credentials: true`; browsers
reject it, and frameworks that reflect the request origin to work around that are wide open.

### W02 API route with no auth check — high
A handler in `pages/api`, `app/**/route.*`, `api/`, `routes/`, `functions/`, `server/` or
`handlers/` with no reference to a session, user, token or auth helper. Fix: first lines of the
handler get the user and return 401 when there is none, then every query is scoped to that user
(`.eq('user_id', user.id)`). If the route is meant to be public, add a `// seatbelt: public`
comment and make sure it only reads public data. Paths containing `webhook`, `health`, `public`,
`login`, `signup`, `og`, `sitemap`, `robots` are treated as public automatically.

### W03 User content rendered as raw HTML — high
`dangerouslySetInnerHTML={{ __html: comment.body }}` or `el.innerHTML = userValue`. Fix: render as
text (`{comment.body}`, `el.textContent = …`), or sanitize with DOMPurify first.

### W04 `eval()` / `new Function()` — high
Fix: replace with `JSON.parse`, a lookup table, or a real parser (for formulas, a library like
`mathjs` with a restricted scope).

### W05 Stripe webhook without signature verification — critical
Fix:
```js
const sig = req.headers.get('stripe-signature');
const raw = await req.text();
const event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
```
Use the raw body, not parsed JSON. For other providers, look for their equivalent (`svix`,
`x-hub-signature`, `lemonsqueezy` HMAC) and verify before trusting the payload.

### W06 SQL built from strings — high
`` query(`... ${id}`) `` or `"... '" + q + "'"`. Fix: parameters. `query('… where id = $1', [id])`,
`?` placeholders, or a tagged `sql\`…\`` template from a library that parameterizes (postgres.js,
Drizzle, Prisma raw with `Prisma.sql`).

### W07 Debug on in production config — medium
Stack traces and internal paths shown to visitors. Fix: `debug: false` in prod config, or read from
an env var that is unset on the server.

## Suppressions

- `seatbelt-ignore` on a line, or the line above it, silences that finding.
- `seatbelt: public` anywhere in a route file marks it intentionally public.
- `seatbelt: server-only` anywhere in a file marks it server-side for D01.

Use these for real exceptions, not to make the report green.
