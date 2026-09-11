# leaky-app answer key

A small Next.js + Supabase app the way a coding agent often ships it on the first try. Every
issue below is deliberate. Do not deploy this. `examples/safe-app` is the same app with every
finding fixed.

The fake keys are shaped to match seatbelt's checks but not GitHub's push protection, and this directory is
excluded from GitHub secret scanning in `.github/secret_scanning.yml`, so forks do not get alert emails. AWS, Google, GitHub and Slack key checks are covered by unit
tests with temp files instead.

| # | Check | File | What is wrong |
|---|-------|------|---------------|
| 1 | R01 | `.env` | Real secrets in `.env`, and `.gitignore` does not ignore it |
| 2 | R02 | `.env` | No `.env.example`, so nobody knows which variables exist |
| 3 | D02 | `.env:3` | Service role key stored as `NEXT_PUBLIC_…`, which Next copies into the browser bundle |
| 4 | D02 | `src/components/AdminPanel.jsx:7` | Same public-prefixed key read in a component |
| 5 | D01 | `src/components/AdminPanel.jsx:7` | `'use client'` component builds a Supabase client with the service role key |
| 6 | S07 | `src/lib/supabase.js:8` | Service role JWT pasted straight into code |
| 7 | S01 | `src/lib/openai.js:3` | OpenAI key hardcoded |
| 8 | S02 | `src/lib/stripe.js:3` | Stripe live secret hardcoded |
| 9 | S08 | `src/lib/jwt.js:3` | Private key PEM block in source |
| 10 | S09 | `src/lib/mailer.js:6` | SMTP password hardcoded |
| 11 | D03 | `supabase/migrations/0001_init.sql:9` | `posts` table created without row level security (`profiles` has it) |
| 12 | D04 | `firestore.rules:5` | `allow read, write: if true` |
| 13 | W01 | `next.config.js:8` | `Access-Control-Allow-Origin: *` together with `Allow-Credentials: true` |
| 14 | W02 | `src/app/api/posts/route.js` | GET and DELETE with no session check, using the admin client |
| 15 | W02 | `src/app/api/admin/users/route.js` | User list with no auth at all |
| 16 | W05 | `src/app/api/stripe/webhook/route.js` | Trusts `req.json()` without `constructEvent` signature check |
| 17 | W03 | `src/components/Comment.jsx:5` | User comment rendered with `dangerouslySetInnerHTML` unsanitized |
| 18 | W06 | `src/lib/db.js:6` | SQL template literal with `${id}` |
| 19 | W06 | `src/lib/db.js:11` | SQL string concatenation with `+ q +` |
| 20 | W04 | `src/lib/formula.js:3` | `eval()` on user-typed formula |
| 21 | W07 | `config/production.json:2` | `"debug": true` in production config |

`src/app/api/me/route.js` is intentionally correct (it calls `supabase.auth.getUser()`), so the
summary line can show routes that pass.

Run it:

```bash
node skills/seatbelt/scripts/scan.js examples/leaky-app
```
