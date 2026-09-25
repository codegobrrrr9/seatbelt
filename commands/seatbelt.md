---
description: Pre-ship safety check. Scans for leaked keys, unprotected tables, open routes and CORS, then fixes what it can and reports READY or NOT READY in plain English.
allowed-tools: Bash(node:*), Read, Edit, Write, Grep, Glob
---

Run the seatbelt pre-ship check on this project.

1. Run the scanner from the project root: `node ${CLAUDE_PLUGIN_ROOT}/skills/seatbelt/scripts/scan.js . --json`
   (if that path does not exist, find `scan.js` under the installed seatbelt skill directory).
2. Fix every critical and high finding yourself. Ask before changing product behavior, such as adding
   auth to a route that may be intentionally public. `${CLAUDE_PLUGIN_ROOT}/skills/seatbelt/references/checks.md`
   has the fix for every check id.
3. Re-run the scanner.
4. Report using the format in the seatbelt skill: verdict first (READY or NOT READY), then findings in
   severity order with the rest behind "and N more, ask to see them", each as one line of what, one sentence of what could happen, one line of what you did
   or need. End with the single next step. No preamble.

$ARGUMENTS
