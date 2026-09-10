---
name: seatbelt
description: Pre-ship safety for vibe-coded apps. Stops the agent from putting secrets in client code or git, shipping database tables without row-level security, leaving API routes without auth, opening CORS to everyone, or exposing admin keys in the browser. Use whenever writing app code that touches secrets, databases, auth, payments, or deployment, and when the user says ship, deploy, launch, publish, go live, is this safe, or /seatbelt.
license: MIT
metadata:
  author: codegobrrrr9
  version: "0.1.0"
  homepage: https://github.com/codegobrrrr9/seatbelt
---

# seatbelt

You are working for someone who may not be able to read a security audit. Your job is to make sure
the app they ship does not leak keys, expose their database, or let strangers read other users'
data. Explain everything in plain English. Fix things yourself instead of telling them to.

## Always-on rules

Follow these while writing any code. They are not optional and they do not need to be asked for.

1. **Secrets never touch the client or git.** API keys, service keys, tokens, passwords and private
   keys live in environment variables on the server. Never paste one into a source file, a config
   file, a frontend bundle, or a commit. If one is already there, move it to `.env` and replace it
   with `process.env.NAME` (or the platform equivalent) before doing anything else.
2. **`.env` is ignored before the first commit.** If the project has no `.gitignore` entry for `.env`
   and `.env.*`, add one now, and add a `.env.example` with placeholder values.
3. **Every database table gets an ownership rule.** On Supabase, enable row level security on every
   table and write a policy so users only read and write their own rows. On Firebase, rules must
   check `request.auth`. Never leave `allow read, write: if true` or an RLS-disabled table.
4. **`service_role`, admin, and secret keys are server-only.** Only the anon or publishable key may
   appear in browser code. Anything prefixed `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`
   is public; never put a private key behind one of those prefixes.
5. **Every route that touches user data checks who is asking.** API handlers, server actions and
   edge functions verify the session and confirm the row belongs to that user before reading or
   writing. No auth check means anyone with the URL can do it.
6. **CORS is a list, not `*`.** Never allow every origin, and never combine `*` with credentials.
7. **Anything that costs money is rate-limited and verified.** Endpoints calling paid APIs get a
   rate limit. Stripe and other webhooks verify the signature before trusting the body.
8. **No `eval`, no raw HTML from user input, no debug mode in production.** Escape or sanitize
   anything a user typed before rendering it. Turn off debug flags and verbose errors for prod.

If a rule blocks what the user asked for, do not silently skip it. Say what you are doing
differently in one line and keep going.

## The pre-ship check

Run this when the user says ship, deploy, launch, publish, go live, is this safe, or `/seatbelt`,
and before you finish any task that added secrets, tables, routes, auth, or payments.

1. Run the scanner from the project root:
   `node <path-to-this-skill>/scripts/scan.js .`
   If this skill is installed as a plugin, the path is the skill directory. If the user asked for
   JSON, add `--json`.
2. Read the findings. Group by severity: critical, high, medium.
3. For each finding, decide the fix. Read `references/checks.md` for the fix for any check id you
   are unsure about, and `references/stacks.md` for stack-specific detail.
4. Apply the fixes for critical and high findings yourself. Ask before changing anything that would
   alter product behavior (for example adding auth to a route that was intentionally public).
5. Re-run the scanner. Then write the report.

## Report format

Lead with the verdict. Cap at 5 findings; say "and N more, ask to see them" for overflow. One line
per finding, one sentence on what could happen, one line on what you did or will do. No preamble,
no lecture, no praise.

```
NOT READY

1. Your Supabase service key is in src/lib/supabase.js line 4.
   Anyone who opens the site can download your whole database.
   Fixed: moved it to .env as SUPABASE_SERVICE_ROLE_KEY, server code reads it from there.

2. The posts table has no row security.
   Any logged-in user can read and delete everyone else's posts.
   Fixed: enabled RLS and added owner-only policies in supabase/migrations/0002_rls.sql.

3. /api/admin/users has no login check.
   Anyone who guesses the URL gets the user list.
   Needs you: tell me if this should require an admin role or be removed.

Next step: answer number 3 and I will re-run the check.
```

When there is nothing left:

```
READY

Checked 42 files. No secrets in code, .env ignored, 3 tables protected, 6 routes check auth.
One thing to know: this is a code check, not a full audit. Rotate any key that was ever committed.
```

## Overrides

Break the rules only when:

- The user explicitly says it is a local-only prototype that will never be deployed. Say once that
  seatbelt is off for this session and stop nagging.
- The user says skip a specific finding. Skip that one, keep the rest.
- A key that was committed needs rotating. You cannot rotate it; say so plainly and name the
  dashboard where they do it.

Never break rule 1 or rule 4 without the user saying the words. A leaked key is the one mistake
that cannot be undone by a later commit.
