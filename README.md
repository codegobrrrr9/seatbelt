<div align="center">

# 🔒 seatbelt

**Stop your coding agent from shipping leaked keys and open databases.**

A pre-ship safety skill for people who build with Claude Code, Codex, Cursor, Gemini CLI, Copilot, Lovable, Bolt or any agent that writes app code for them.

[![test](https://github.com/codegobrrrr9/seatbelt/actions/workflows/test.yml/badge.svg)](https://github.com/codegobrrrr9/seatbelt/actions/workflows/test.yml)
[![license](https://img.shields.io/github/license/codegobrrrr9/seatbelt)](LICENSE)
![zero deps](https://img.shields.io/badge/dependencies-0-brightgreen)

</div>

## Install

Paste this into your coding agent:

```
Install the seatbelt skill from https://github.com/codegobrrrr9/seatbelt, refer to the repo's AGENTS.md.
```

The agent installs itself. From then on it follows the rules while it writes code, and when you say
**"ship it"** (or `/seatbelt`) it checks the project and tells you, in plain English, whether it is
safe to deploy and what it fixed.

No agent yet? Scan any project right now, nothing to install:

```bash
npx --yes --allow-git=all github:codegobrrrr9/seatbelt .
```

(npm 12 blocks git-sourced packages by default, hence the flag. On older npm, plain
`npx github:codegobrrrr9/seatbelt .` works.)

## Why

Vibe-coded apps leak. Not sometimes, most of the time.

- **11%** of 20,000+ indie launches expose their Supabase key in the frontend, many with row security off. ([source](https://news.ycombinator.com/item?id=46662304))
- **98%** of 1,072 scanned vibe-coded apps had at least one security flaw. ([source](https://www.symbioticsec.ai/blog/we-scanned-1-072-vibe-coded-apps-98-had-security-flaws))
- **1.5 million API keys** and 35,000 emails leaked from one app's misconfigured Supabase database. ([source](https://getautonoma.com/blog/vibe-coding-failures))

The agent did not lie to you. It did what you asked: "make the admin page work". The fastest way
to make the admin page work is to paste the god-mode key into the browser bundle. Nobody told it
not to. seatbelt tells it not to, and checks afterwards.

## Before / after

You ask: *"add an admin page that lists all users"*

**Without seatbelt** the agent ships this and says done:

```jsx
'use client';
const admin = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
// every visitor's browser now holds the key that bypasses all your security rules
```

**With seatbelt** the agent puts the key on the server, gates the route, and reports:

```
NOT READY

1. Your Supabase service key was in src/components/AdminPanel.jsx line 7.
   Anyone who opened the site could download your whole database.
   Fixed: moved it to .env as SUPABASE_SERVICE_ROLE_KEY. The page now calls /api/admin/users,
   which checks the user is an admin before using it.

2. The posts table has no row security.
   Any logged-in user can read and delete everyone else's posts.
   Fixed: enabled RLS and added owner-only policies in supabase/migrations/0002_rls.sql.

3. Your .env is not in .gitignore.
   Every key in it goes to GitHub on your next push, where bots find it in minutes.
   Fixed: added it. If you already pushed, rotate the keys in the Supabase dashboard today.

Next step: run the migration, then say "ship it" again.
```

Verdict first. What, what could happen, what it did. Capped at five. No lecture.

## What it checks

The skill has two halves. **Rules** the agent follows while writing code, and a **scanner** it
runs before you ship. The scanner is one Node file with zero dependencies.

| Area | Catches |
|------|---------|
| **Secrets in code** | OpenAI, Anthropic, Stripe, AWS, Google, GitHub, Slack keys, Supabase `service_role` JWTs and `sb_secret_` keys, private key blocks, hardcoded passwords |
| **Repo hygiene** | `.env` not in `.gitignore`, no `.env.example` |
| **Database** | Supabase tables without row level security, `service_role` used in client code, private keys behind `NEXT_PUBLIC_` / `VITE_` / `REACT_APP_` / `EXPO_PUBLIC_`, Firebase rules set to `if true` |
| **Routes** | API handlers with no auth check, CORS `*` (worse with credentials), Stripe webhooks that skip signature verification |
| **Code** | `eval`, unsanitized `innerHTML` / `dangerouslySetInnerHTML`, SQL built from strings, debug mode in production config |

Every finding comes with a one-sentence "what could happen" and a fix. Full list with fixes in
[`skills/seatbelt/references/checks.md`](skills/seatbelt/references/checks.md). Stack-specific
notes (Supabase, Firebase, Next, Vite, Express, Vercel, Stripe, Clerk) in
[`references/stacks.md`](skills/seatbelt/references/stacks.md).

## Does it work

[`examples/leaky-app`](examples/leaky-app) is a Next.js + Supabase app the way an agent tends to
write it on the first pass, with 21 planted holes across 17 check types
([answer key](examples/leaky-app/PLANTED.md)). [`examples/safe-app`](examples/safe-app) is the same
app fixed.

| Fixture | Findings | Verdict |
|---------|----------|---------|
| `leaky-app` | 21 / 21 planted issues found, 0 false positives | NOT READY |
| `safe-app` | 0 | READY, 2/2 tables protected, 4/4 routes check auth |

23 unit tests cover every check, the suppressions, and the things that must **not** fire
(placeholders, `.env.example`, parameterized SQL, sanitized HTML, server-only files, test fixtures).

```bash
git clone https://github.com/codegobrrrr9/seatbelt && cd seatbelt
npm test
node skills/seatbelt/scripts/scan.js examples/leaky-app
```

An agent-in-the-loop benchmark (same fixture, prompt "ship this", with and without the skill,
scored by re-scanning what the agent actually shipped) lives in
[`benchmarks/`](benchmarks/run.md). Results are published there as they are run.

## Install by agent

| Agent | How |
|-------|-----|
| **Claude Code** | `/plugin marketplace add codegobrrrr9/seatbelt` then `/plugin install seatbelt@seatbelt`. Or copy `skills/seatbelt/` to `~/.claude/skills/seatbelt/`. Adds `/seatbelt`. |
| **Codex** | Copy `skills/seatbelt/` to `~/.codex/skills/seatbelt/` and append the Rules from [`AGENTS.md`](AGENTS.md) to your project's `AGENTS.md`. |
| **Cursor** | Copy [`.cursor/rules/seatbelt.mdc`](.cursor/rules/seatbelt.mdc) into your project and `scan.js` to `.cursor/seatbelt/scan.js`. |
| **Gemini CLI** | `gemini extensions install https://github.com/codegobrrrr9/seatbelt` |
| **GitHub Copilot** | Copy [`.github/copilot-instructions.md`](.github/copilot-instructions.md) into your repo. |
| **Any agent with a skills CLI** | `npx skills add codegobrrrr9/seatbelt` |
| **Anything else** | Append the Rules section of [`AGENTS.md`](AGENTS.md) to whatever file your agent reads, and keep `scan.js` somewhere in the project. |

Or paste the one-liner at the top and let the agent do it.

## Using it

- Just build. The rules are on. If the agent has to deviate from what you asked to stay safe, it
  says so in one line.
- Say **ship it**, **deploy**, **go live**, **is this safe**, or `/seatbelt` to run the check.
- `seatbelt-ignore` on a line silences one finding. `// seatbelt: public` marks a route that is
  meant to be open. `import 'server-only'` or `// seatbelt: server-only` marks a file that may hold
  the service key.
- Local-only prototype? Say so once and seatbelt stops nagging for the session.

## Tune it

Fork it and make it yours. Three places to edit:

- **The rules**: [`skills/seatbelt/SKILL.md`](skills/seatbelt/SKILL.md). Add, remove, reorder.
  Keep it under 500 lines so agents load it whole.
- **The checks**: [`skills/seatbelt/scripts/scan.js`](skills/seatbelt/scripts/scan.js). Every
  check is an id, a severity, a plain-English consequence, and a regex or a few lines of logic.
  Add one, add a test in [`tests/scan.test.js`](tests/scan.test.js), done.
- **Your stack**: [`references/stacks.md`](skills/seatbelt/references/stacks.md). Add the thing
  your platform gets wrong.

PRs for new checks welcome, with a test and a planted example.

## Honest limits

This is a code check, not a security audit. It reads files; it does not run your app, probe your
endpoints, or know about your hosting config. It will miss things. It has no false-positive-free
guarantee, which is why every finding says what could happen so you can judge. If a key was ever
committed, rotate it. No scanner can un-leak it.

## Credits

Shape borrowed from the skills that showed a single SKILL.md can change how agents behave:
[i-have-adhd](https://github.com/ayghri/i-have-adhd), [ponytail](https://github.com/DietrichGebert/ponytail),
[humanizer](https://github.com/blader/humanizer). Numbers from the researchers who scanned the
vibe-coded web so the rest of us would believe it.

## License

MIT. Star ⭐ if it caught something before your users did.
