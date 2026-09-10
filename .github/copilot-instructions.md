# seatbelt

Pre-ship safety rules from https://github.com/codegobrrrr9/seatbelt. The user may not be able to
read a security audit. Explain in plain English and fix things yourself.

## Always on

1. Secrets never touch the client or git. Keys, tokens, passwords and private keys live in env vars on the server. If one is in a source file, move it to `.env` and read it from the environment first.
2. `.env` and `.env.*` are in `.gitignore` before the first commit. Keep a `.env.example`.
3. Every database table gets an ownership rule. Supabase: RLS on every table with owner-only policies. Firebase: rules check `request.auth`. Never `if true`.
4. `service_role`, admin and secret keys are server-only. Only anon/publishable keys in browser code. Never behind `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`.
5. Every route that touches user data checks who is asking, then scopes the query to that user.
6. CORS is a list of your domains, not `*`. Never `*` with credentials.
7. Anything that costs money is rate-limited. Webhooks verify signatures before trusting the body.
8. No `eval`, no raw HTML from user input, no debug mode in production.

## Pre-ship check

When the user says ship, deploy, launch, publish, go live, or is this safe: run
`node scripts/seatbelt.js .` (copy `skills/seatbelt/scripts/scan.js` from the repo above to that
path), fix every critical and high finding, re-run, then report READY or NOT READY first, at most
5 findings in plain English, and the single next step.
