# seatbelt — instructions for coding agents

You are reading this because a user pasted something like:

> Install the seatbelt skill from https://github.com/codegobrrrr9/seatbelt, refer to the repo's AGENTS.md.

Do the install for the agent you are, confirm in one line, and then follow the rules below for the
rest of the session. Do not explain what seatbelt is unless asked.

## Install

Pick the row that matches you. `<repo>` is a clone of this repository, or the raw files fetched
from `https://raw.githubusercontent.com/codegobrrrr9/seatbelt/main/`.

| Agent | Do this |
|-------|---------|
| Claude Code | Run `/plugin marketplace add codegobrrrr9/seatbelt` then `/plugin install seatbelt@seatbelt`. If plugins are unavailable, copy `<repo>/skills/seatbelt/` to `~/.claude/skills/seatbelt/` (all users) or `.claude/skills/seatbelt/` (this project only). |
| Codex | Copy `<repo>/skills/seatbelt/` to `~/.codex/skills/seatbelt/`, or run `npx skills add codegobrrrr9/seatbelt`. Also append the **Rules** section below to the project's `AGENTS.md`. |
| Cursor | Copy `<repo>/.cursor/rules/seatbelt.mdc` to `.cursor/rules/seatbelt.mdc` in the project. Copy `<repo>/skills/seatbelt/scripts/scan.js` to `.cursor/seatbelt/scan.js`. |
| Gemini CLI | Run `gemini extensions install https://github.com/codegobrrrr9/seatbelt`. |
| GitHub Copilot | Copy `<repo>/.github/copilot-instructions.md` into the project's `.github/` (merge if one exists). |
| Windsurf, Cline, Roo, Kilo, Amp, OpenCode, Zed, anything else | Append the **Rules** section below to the project's `AGENTS.md` (or `.windsurfrules`, `.clinerules`, whichever the agent reads) and copy `scan.js` somewhere in the project, for example `scripts/seatbelt.js`. |

Any agent: `npx skills add codegobrrrr9/seatbelt` installs the skill directory for every agent the
`skills` CLI supports.

After installing, say: `seatbelt on. Say "ship it" or /seatbelt for the pre-ship check.`

## Rules

Follow these while writing any code. They apply without being asked.

1. **Secrets never touch the client or git.** API keys, service keys, tokens, passwords and private
   keys live in environment variables on the server. If one is already in a source file, move it to
   `.env` and replace it with an environment read before doing anything else.
2. **`.env` is ignored before the first commit.** Add `.env` and `.env.*` to `.gitignore`, and keep a
   `.env.example` with placeholder values.
3. **Every database table gets an ownership rule.** Supabase: enable row level security on every
   table and write owner-only policies. Firebase: rules check `request.auth`. Never `if true`.
4. **`service_role`, admin and secret keys are server-only.** Only anon or publishable keys go in
   browser code. Never put a private key behind `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`.
5. **Every route that touches user data checks who is asking**, then scopes the query to that user.
6. **CORS is a list, not `*`.** Never combine `*` with credentials.
7. **Anything that costs money is rate-limited and verified.** Webhooks verify signatures first.
8. **No `eval`, no raw HTML from user input, no debug mode in production.**

If a rule changes what the user asked for, say so in one line and keep going.

## Pre-ship check

When the user says ship, deploy, launch, publish, go live, is this safe, or `/seatbelt`, and before
finishing any task that added secrets, tables, routes, auth or payments:

1. Run `node <path-to>/scan.js .` from the project root (`--json` for machine output).
2. Fix every critical and high finding yourself. Ask before changing product behavior, such as
   adding auth to a route that was meant to be public. `skills/seatbelt/references/checks.md`
   has the fix for every check id.
3. Re-run, then report in this shape, capped at 5 findings, no preamble:

```
NOT READY

1. Your Supabase service key is in src/lib/supabase.js line 8.
   Anyone who opens the site can download your whole database.
   Fixed: moved it to .env as SUPABASE_SERVICE_ROLE_KEY, only server code reads it.

2. /api/admin/users has no login check.
   Anyone who guesses the URL gets the user list.
   Needs you: should this require an admin role, or be removed?

Next step: answer number 2 and I will re-run the check.
```

or

```
READY

Checked 42 files. No secrets in code, .env ignored, 3/3 tables protected, 6/6 routes check auth.
This is a code check, not a full audit. Rotate any key that was ever committed.
```

## Overrides

- User says it is a local-only prototype that will never be deployed: say seatbelt is off for this
  session, once, and stop.
- User says skip a specific finding: skip that one, keep the rest.
- A committed key must be rotated by the user. Say so plainly and name where.

Rules 1 and 4 are never skipped silently. A leaked key cannot be un-leaked by a later commit.
