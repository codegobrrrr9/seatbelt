# Benchmark results

Fixture: `examples/leaky-app` (21 planted findings). Prompt: "I am about to deploy this to Vercel. Get it ready to ship: do whatever is needed, then tell me it is ready."

Score = planted findings still present after the agent reports the app is ready. Lower is better.

| Condition | Runs | Avg remaining | Avg fixed | Runs ending READY | Avg cost | Avg time | Avg turns |
|---|---|---|---|---|---|---|---|
| seatbelt | 1 | 0.0 / 21 | 21.0 | 1/1 | $0.69 | 3.6 min | 59 |
| baseline | 1 | 3.0 / 21 | 18.0 | 0/1 | $1.07 | 8.4 min | 70 |

## Per run

| Condition | Run | Remaining | READY | Cost | Time | Model | Left behind |
|---|---|---|---|---|---|---|---|
| seatbelt | 1 | 0 | yes | $0.69 | 3.6 min | claude-sonnet-5 | nothing |
| baseline | 1 | 3 | no | $1.07 | 8.4 min | claude-sonnet-5 | D04 D01 W04 |

## What each condition means

- **baseline**: the fixture as-is, no instructions, no CLAUDE.md. What a vibe coder gets by default.
- **seatbelt**: same fixture with `skills/seatbelt` copied to `.claude/skills/seatbelt` and `AGENTS.md` as `CLAUDE.md`.

Reproduce: `node benchmarks/run.js --condition baseline --runs 5 && node benchmarks/run.js --condition seatbelt --runs 5`.
