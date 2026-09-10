#!/usr/bin/env node
// seatbelt scanner — zero-dependency pre-ship safety check for vibe-coded apps.
// Usage: node scan.js [dir] [--json] [--all]
//   --json  machine-readable output
//   --all   also scan markdown and files normally skipped as docs
// Exit code: 1 when anything critical or high is found, else 0.
// Suppress one finding: put "seatbelt-ignore" on the same line or the line above.
// Mark an intentionally public route: put "seatbelt: public" anywhere in the file.
// Mark a file as server-only: import 'server-only', 'use server', or "seatbelt: server-only".

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output', 'out',
  'coverage', '.turbo', '.cache', '.vercel', '.svelte-kit', 'vendor', '__pycache__', '.venv', 'venv',
  '.expo', 'ios', 'android', '.gradle', 'target', '.idea', '.vscode']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.pdf', '.zip', '.gz',
  '.tar', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp3', '.mp4', '.mov', '.webm', '.wasm', '.lock',
  '.map', '.exe', '.dll', '.so', '.dylib', '.bin', '.jar', '.class', '.pyc']);
const DOC_EXT = new Set(['.md', '.mdx', '.txt', '.rst']);
const MAX_BYTES = 1024 * 1024;

const PLACEHOLDER = /(example|placeholder|your[_-]|xxx|<[^>]*>|changeme|change-me|dummy|redacted|\bfake\b|\btodo\b|insert[_ -]|replace[_ -]me|\.\.\.)/i;
const SERVER_PATH = /(^|[\\/])(api|server|functions|scripts|middleware|backend|worker|workers|cron|edge|jobs|supabase[\\/]functions|netlify[\\/]functions|\.netlify|lambda|app[\\/]api)([\\/]|$)/;
const SERVER_FILE = /(\.server\.|[\\/]route\.[cm]?[jt]sx?$|[\\/]middleware\.[cm]?[jt]s$|[\\/]actions?\.[cm]?[jt]s$|[\\/]server\.[cm]?[jt]s$|[\\/]instrumentation\.[cm]?[jt]s$)/;
const ROUTE_PATH = /([\\/]pages[\\/]api[\\/]|[\\/]app[\\/].*[\\/]route\.[cm]?[jt]sx?$|[\\/]api[\\/].*\.[cm]?[jt]s$|[\\/]routes?[\\/].*\.[cm]?[jt]s$|[\\/]functions[\\/].*\.[cm]?[jt]s$|[\\/]server[\\/].*\.[cm]?[jt]s$|[\\/]handlers?[\\/].*\.[cm]?[jt]s$)/;
const ROUTE_PUBLIC = /(webhook|health|ping|status|public|[\\/]og[\\/.]|sitemap|robots|manifest|favicon|_next|auth[\\/](callback|login|signin|signup|register|logout|magic)|login|signin|signup|register)/i;
const HANDLER_RE = /(export\s+default|export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=|router\.(get|post|put|patch|delete|all|use)\(|app\.(get|post|put|patch|delete|all)\(|exports\.handler|module\.exports\s*=|Deno\.serve\(|\bserve\(|onRequest|onCall|createTRPCRouter|publicProcedure|defineEventHandler|export\s+(async\s+)?function\s+handler)/;
const AUTH_RE = /(getUser\(|getSession\(|auth\(\)|auth\.(getUser|getSession|uid|currentUser|verifyIdToken|verifySessionCookie|api|protect)|verifyIdToken|verifyToken|verifyJwt|jwt\.verify|jsonwebtoken|requireAuth|requireUser|requireSession|requireAdmin|withAuth|withApiAuth|isAuthenticated|ensureAuth|currentUser\(|clerkClient|getAuth\(|nextauth|getServerSession|authOptions|createServerClient|supabase\.auth|supabaseServer|Authorization|authorization|bearer|Bearer|passport|protectedProcedure|useSession|locals\.user|req\.user|ctx\.user|context\.user|event\.context\.user|apiKey ===|API_KEY ===|x-api-key|lucia|kinde|auth0|firebase-admin|admin\.auth\(|getToken\(|validateRequest|checkAuth|authenticate\(|authMiddleware|authGuard|verifyAuth|verifyUser|assertUser|assertAuth|unauthorized)/i;

export const CHECKS = {
  S01: ['critical', 'OpenAI / Anthropic style secret key in code', 'Anyone who reads your code or bundle can run up your API bill.'],
  S02: ['critical', 'Stripe live secret key in code', 'Anyone who finds it can create refunds, read customers and move money.'],
  S03: ['critical', 'AWS access key in code', 'Anyone who finds it can use your AWS account, including spinning up expensive servers.'],
  S04: ['critical', 'Google API key in code', 'Anyone can use your quota and, depending on the key, read your Firebase or Maps data.'],
  S05: ['critical', 'GitHub token in code', 'Anyone who finds it can read and push to your repos as you.'],
  S06: ['critical', 'Slack token in code', 'Anyone who finds it can read and post in your Slack as your bot.'],
  S07: ['critical', 'Supabase service_role or secret key in code', 'This key bypasses every security rule. Anyone who gets it can download and delete your whole database.'],
  S08: ['critical', 'Private key file contents in code', 'Anyone who finds it can impersonate your server or sign in as your service.'],
  S09: ['high', 'Hardcoded password, token or secret', 'It ships to everyone who can read the code or the bundle.'],
  R01: ['critical', '.env file is not ignored by git', 'Every secret in it will be committed and pushed to GitHub, where bots scan for keys within minutes.'],
  R02: ['medium', 'No .env.example', 'Collaborators and future you will not know which variables the app needs, so someone pastes real keys into code.'],
  D01: ['critical', 'Supabase service_role key used in client-side code', 'The browser bundle ships the key that bypasses all row security. Anyone can read and wipe your database.'],
  D02: ['critical', 'Private key stored under a public env prefix', 'NEXT_PUBLIC_, VITE_, REACT_APP_ and EXPO_PUBLIC_ variables are copied into the browser bundle for everyone to see.'],
  D03: ['critical', 'Database table without row level security', 'Any logged-in user (or anyone with the anon key) can read, change and delete every row in the table.'],
  D04: ['critical', 'Firebase rules open to everyone', 'Anyone on the internet can read and write your entire database or storage bucket.'],
  W01: ['high', 'CORS allows every origin', 'Any website can make requests to your API on behalf of your users.'],
  W02: ['high', 'API route with no auth check', 'Anyone who guesses the URL can call it, no login needed.'],
  W03: ['high', 'User content rendered as raw HTML', 'A user can paste a script that runs in every other visitor\'s browser and steals their session.'],
  W04: ['high', 'eval() or new Function() on runtime strings', 'If any input reaches it, an attacker runs arbitrary code in your app.'],
  W05: ['critical', 'Stripe webhook does not verify the signature', 'Anyone can POST a fake "payment succeeded" event and get your product for free.'],
  W06: ['high', 'SQL built from string concatenation or template', 'A user can type SQL into a field and read or delete your whole database.'],
  W07: ['medium', 'Debug mode on in production config', 'Stack traces, internal paths and sometimes env values are shown to visitors.'],
};
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };

function b64urlJson(s) {
  try { return JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }
  catch { return null; }
}
function lineOf(content, index) { let n = 1; for (let i = 0; i < index && i < content.length; i++) if (content.charCodeAt(i) === 10) n++; return n; }
function lineText(lines, n) { return lines[n - 1] ?? ''; }
function ignored(lines, n) { return /seatbelt-ignore/.test(lineText(lines, n)) || /seatbelt-ignore/.test(lineText(lines, n - 1)); }
function isEnvFile(name) { return name === '.env' || name.startsWith('.env.'); }
function isEnvExample(name) { return /^\.env\.(example|sample|template)$/.test(name); }
function toPosix(p) { return p.split(sep).join('/'); }

function walk(root, all) {
  const files = [];
  const rec = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) rec(join(dir, e.name)); continue; }
      if (!e.isFile()) continue;
      const full = join(dir, e.name);
      const ext = extname(e.name).toLowerCase();
      if (BINARY_EXT.has(ext) || e.name.endsWith('.min.js') || e.name.endsWith('.min.css')) continue;
      if (!all && DOC_EXT.has(ext)) continue;
      if (e.name === 'package-lock.json' || e.name === 'pnpm-lock.yaml' || e.name === 'yarn.lock') continue;
      let st; try { st = statSync(full); } catch { continue; }
      if (st.size > MAX_BYTES) continue;
      files.push(full);
    }
  };
  rec(root);
  return files;
}

export function scan(rootArg = '.', opts = {}) {
  const root = rootArg;
  const started = Date.now();
  const files = walk(root, !!opts.all);
  const findings = [];
  const seen = new Set();
  const summary = { filesScanned: files.length, tables: 0, tablesProtected: 0, routes: 0, routesWithAuth: 0 };
  const add = (id, file, line, detail) => {
    const key = `${id}|${file}|${line}`;
    if (seen.has(key)) return;
    // a specific key check (S01-S08) on a line beats the generic S09 on the same line
    if (id === 'S09' && [...seen].some(k => /^S0[1-8]\|/.test(k) && k.endsWith(`|${file}|${line}`))) return;
    seen.add(key);
    const [severity, title, plain] = CHECKS[id];
    findings.push({ id, severity, file: toPosix(relative(root, file)) || basename(file), line, title, plain, detail: detail || '' });
  };

  // Repo hygiene
  const gitignorePath = join(root, '.gitignore');
  const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';
  const envIgnored = /^\s*(\.env(\.\*|\*|\.local|\.[a-z]+)?|\*\.env|\*\*\/\.env\*?)\s*$/m.test(gitignore);
  const envFiles = files.filter(f => isEnvFile(basename(f)) && !isEnvExample(basename(f)));
  const hasExample = files.some(f => isEnvExample(basename(f)));
  if (envFiles.length && !envIgnored) for (const f of envFiles) add('R01', f, 1, 'Add ".env" and ".env.*" to .gitignore, then rotate every key inside it if it was ever pushed.');
  if (envFiles.length && !hasExample) add('R02', envFiles[0], 1, 'Create .env.example with the same variable names and placeholder values.');

  const sqlTexts = [];
  for (const file of files) {
    let content; try { content = readFileSync(file, 'utf8'); } catch { continue; }
    if (content.includes(' ')) continue;
    const name = basename(file);
    const rel = toPosix(relative(root, file));
    const lines = content.split('\n');
    const ext = extname(name).toLowerCase();
    const isEnv = isEnvFile(name);
    const isExample = isEnvExample(name);
    const isTestish = /(^|\/)(test|tests|__tests__|spec|fixtures?|mocks?|__mocks__)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/i.test(rel);
    const isCode = /\.(js|jsx|ts|tsx|mjs|cjs|mts|cts|vue|svelte|astro|py|rb|go|php|java|kt|swift|dart|cs|rs)$/.test(name);
    const isServer = SERVER_PATH.test('/' + rel) || SERVER_FILE.test('/' + rel) || /['"]use server['"]|['"]server-only['"]|seatbelt:\s*server-only/.test(content);
    const isClient = /['"]use client['"]/.test(content) || /(^|\/)(public|static)\//.test(rel);

    const each = (re, fn) => { re.lastIndex = 0; let m; while ((m = re.exec(content))) { const ln = lineOf(content, m.index); if (!ignored(lines, ln)) fn(m, ln); if (!re.global) break; } };

    // Secrets in code (not in real .env files, which are supposed to hold them)
    if (!isEnv || isExample) {
      const realish = (m, ln) => !PLACEHOLDER.test(lineText(lines, ln));
      each(/\bsk-(proj-|ant-|or-v1-)?[A-Za-z0-9_-]{20,}/g, (m, ln) => { if (realish(m, ln)) add('S01', file, ln, 'Move it to .env and read it with process.env on the server.'); });
      each(/\b(sk|rk)_live_[A-Za-z0-9]{16,}/g, (m, ln) => { if (realish(m, ln)) add('S02', file, ln, 'Move it to .env as STRIPE_SECRET_KEY, then roll the key in the Stripe dashboard.'); });
      each(/\bAKIA[0-9A-Z]{16}\b/g, (m, ln) => { if (realish(m, ln)) add('S03', file, ln, 'Move it to .env, then deactivate this key in AWS IAM and create a new one.'); });
      each(/\bAIza[0-9A-Za-z_-]{35}\b/g, (m, ln) => { if (realish(m, ln)) add('S04', file, ln, 'If this is a Firebase web key it can be public but must be restricted by domain in Google Cloud console. Any other Google key goes to .env.'); });
      each(/\bgh[pousr]_[A-Za-z0-9]{30,}\b/g, (m, ln) => { if (realish(m, ln)) add('S05', file, ln, 'Move it to .env, then revoke it at github.com/settings/tokens.'); });
      each(/\bxox[bpae]-[A-Za-z0-9-]{10,}/g, (m, ln) => { if (realish(m, ln)) add('S06', file, ln, 'Move it to .env, then regenerate it in the Slack app settings.'); });
      each(/\bsb_secret_[A-Za-z0-9_-]{10,}/g, (m, ln) => { if (realish(m, ln)) add('S07', file, ln, 'Move it to .env as SUPABASE_SECRET_KEY and only read it in server code. Rotate it in the Supabase dashboard.'); });
      each(/\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g, (m, ln) => {
        const payload = b64urlJson(m[1]);
        if (payload && payload.role === 'service_role' && realish(m, ln)) add('S07', file, ln, 'Move it to .env as SUPABASE_SERVICE_ROLE_KEY and only read it in server code. Rotate it in the Supabase dashboard.');
      });
      each(/-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY( BLOCK)?-----/g, (m, ln) => add('S08', file, ln, 'Remove it from the repo, store it as an env var or secret file outside git, and generate a new key.'));
      if (isCode && !isTestish) {
        each(/\b(api[_-]?key|apikey|secret|client[_-]?secret|password|passwd|auth[_-]?token|access[_-]?token|private[_-]?key)\b\s*[:=]\s*['"`]([^'"`\n]{8,})['"`]/gi, (m, ln) => {
          const val = m[2]; const lt = lineText(lines, ln);
          if (PLACEHOLDER.test(lt) || /process\.env|import\.meta\.env|Deno\.env|os\.environ|getenv|\$\{/.test(lt)) return;
          if (/\s/.test(val.trim())) return; // sentences are labels, not secrets
          add('S09', file, ln, 'Move the value to .env and read it from the environment on the server.');
        });
      }
    }

    // Public env prefix holding a private key (env files and code)
    each(/\b(NEXT_PUBLIC_|VITE_|REACT_APP_|EXPO_PUBLIC_|NUXT_PUBLIC_|PUBLIC_)[A-Z0-9_]*(SECRET|SERVICE_ROLE|SERVICE_KEY|PRIVATE|PASSWORD|ADMIN_KEY)[A-Z0-9_]*/g, (m, ln) => {
      if (isExample) return;
      add('D02', file, ln, `Rename ${m[0]} to drop the public prefix and only read it in server code.`);
    });

    // service_role referenced from client-side code
    if (isCode && !isServer && !isTestish) {
      each(/(SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|['"]service_role['"]|sb_secret_)/g, (m, ln) => {
        if (isClient || !/\.(py|rb|go|php|java|kt|cs|rs)$/.test(name)) add('D01', file, ln, 'Move this code to a server route, edge function or server action. Browser code may only use the anon or publishable key.');
      });
    }

    // Firebase rules
    if (/\.rules$/.test(name)) {
      each(/allow\s+(read|write|create|update|delete|list|get)(\s*,\s*(read|write|create|update|delete|list|get))*\s*:\s*if\s+true\s*;/g, (m, ln) => add('D04', file, ln, 'Change to "if request.auth != null && request.auth.uid == resource.data.ownerId" (or the field that names the owner).'));
    }
    if (/\.rules\.json$/.test(name)) {
      each(/"\.(read|write)"\s*:\s*true/g, (m, ln) => add('D04', file, ln, 'Change to "auth != null && auth.uid == $uid" style rules so users only touch their own data.'));
    }

    // SQL collected for RLS check
    if (ext === '.sql') sqlTexts.push({ file, content, lines });

    // Web checks
    if (isCode || /\.(json|yaml|yml|toml)$/.test(name)) {
      const hasCreds = /credentials\s*:\s*true|Access-Control-Allow-Credentials['"]?\s*[:,]\s*['"]?true|withCredentials\s*:\s*true/i.test(content);
      each(/(Access-Control-Allow-Origin['"]?\s*[:,=]\s*['"]\*['"]|Access-Control-Allow-Origin['"]\s*,\s*value\s*:\s*['"]\*['"]|\borigin\s*:\s*['"]\*['"]|\borigin\s*:\s*true\b|\bcors\(\s*\))/g, (m, ln) => add('W01', file, ln, hasCreds ? 'This file also sends credentials, which makes it worse. Replace * with a list of your own domains.' : 'Replace * with a list of your own domains, for example origin: ["https://yourapp.com"].'));
    }
    if (isCode) {
      each(/dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*([^}]+)\}/g, (m, ln) => { const v = m[1]; if (/^['"`]/.test(v.trim()) || /sanitize|purify|clean|escape/i.test(v)) return; add('W03', file, ln, 'Run the value through DOMPurify.sanitize() first, or render it as text instead of HTML.'); });
      each(/\.innerHTML\s*=\s*(?=\S)(?!['"`][^$`])([^;\n]+)/g, (m, ln) => { if (/sanitize|purify|clean|escape/i.test(m[1])) return; add('W03', file, ln, 'Use textContent, or sanitize with DOMPurify before assigning innerHTML.'); });
      each(/\beval\s*\(|new\s+Function\s*\(/g, (m, ln) => add('W04', file, ln, 'Replace with JSON.parse, a lookup table, or a proper parser. There is almost never a reason to keep it.'));
      each(/\.(query|execute|raw|run|all|get|exec)\(\s*`[^`]*\$\{/g, (m, ln) => add('W06', file, ln, 'Use a parameterized query: pass values as $1, ? or named params instead of putting them in the string.'));
      each(/\b(SELECT|INSERT|UPDATE|DELETE)\b[^\n]{0,160}['"`]\s*\+\s*[A-Za-z_$][\w$.]*/gi, (m, ln) => add('W06', file, ln, 'Use a parameterized query instead of concatenating user input into SQL.'));
      if (/stripe/i.test(content) && /webhook/i.test(content + ' ' + rel) && HANDLER_RE.test(content) && !/constructEvent|constructEventAsync|verify(Stripe)?Signature|stripe-signature/i.test(content)) {
        add('W05', file, 1, 'Read the raw body and call stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET) before trusting the event.');
      }
      // routes without auth
      if (ROUTE_PATH.test('/' + rel) && HANDLER_RE.test(content) && !isTestish) {
        summary.routes++;
        if (AUTH_RE.test(content)) summary.routesWithAuth++;
        else if (!ROUTE_PUBLIC.test(rel) && !/seatbelt:\s*public/.test(content)) add('W02', file, 1, 'Add a session check at the top of the handler and return 401 when there is no user. If this route is meant to be public, add a comment "seatbelt: public".');
        else summary.routesWithAuth++;
      }
    }
    if (/(prod|production)/i.test(rel) || /^(next|nuxt|vite|app|remix|svelte)\.config\.[cm]?[jt]s$|^config\.(json|yaml|yml|toml)$|^settings\.py$/.test(name)) {
      each(/\b(DEBUG|debug|APP_DEBUG)["']?\s*[:=]\s*(true|True|1|['"]true['"])\b/g, (m, ln) => { if (/^(next|nuxt|vite|app|remix|svelte)\.config/.test(name) && !/prod/i.test(content)) return; add('W07', file, ln, 'Set debug to false for production, or read it from an env var that is false on the server.'); });
    }
  }

  // RLS across all SQL
  if (sqlTexts.length) {
    const all = sqlTexts.map(s => s.content).join('\n');
    const rlsEnabled = new Set();
    for (const m of all.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:"?[\w]+"?\.)?"?([\w]+)"?\s+(enable|force)\s+row\s+level\s+security/gi)) rlsEnabled.add(m[1].toLowerCase());
    for (const s of sqlTexts) {
      for (const m of s.content.matchAll(/create\s+(temp\s+|temporary\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/gi)) {
        if (m[1]) continue;
        const schema = (m[2] || 'public').toLowerCase(); const table = m[3].toLowerCase();
        if (['auth', 'storage', 'extensions', 'pg_catalog', 'information_schema', 'supabase_functions', 'net', 'vault', 'realtime', 'graphql', 'cron', 'drizzle', 'prisma', 'pg_temp'].includes(schema)) continue;
        if (/^_?(prisma_migrations|schema_migrations|migrations|knex_migrations|drizzle_migrations)$/.test(table)) continue;
        const ln = lineOf(s.content, m.index);
        if (ignored(s.lines, ln)) continue;
        summary.tables++;
        if (rlsEnabled.has(table)) summary.tablesProtected++;
        else add('D03', s.file, ln, `Add: alter table ${table} enable row level security; then a policy such as create policy "own rows" on ${table} for all using (auth.uid() = user_id);`);
      }
      for (const m of s.content.matchAll(/alter\s+table\s+(?:"?\w+"?\.)?"?(\w+)"?\s+disable\s+row\s+level\s+security/gi)) {
        const ln = lineOf(s.content, m.index); if (ignored(s.lines, ln)) continue;
        add('D03', s.file, ln, `Row security is explicitly turned off for ${m[1]}. Remove this line and add owner-only policies instead.`);
      }
    }
  }

  findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.file.localeCompare(b.file) || a.line - b.line);
  const counts = { critical: 0, high: 0, medium: 0 };
  for (const f of findings) counts[f.severity]++;
  const ready = counts.critical === 0 && counts.high === 0;
  return { root: toPosix(root), ready, counts, findings, summary, ms: Date.now() - started };
}

export function format(result) {
  const out = [];
  const { counts, findings, summary } = result;
  out.push(`seatbelt  scanned ${summary.filesScanned} files in ${result.ms}ms`);
  out.push('');
  for (const sev of ['critical', 'high', 'medium']) {
    const list = findings.filter(f => f.severity === sev);
    if (!list.length) continue;
    out.push(`${sev.toUpperCase()} (${list.length})`);
    for (const f of list) {
      out.push(`  ${f.id}  ${f.file}:${f.line}`);
      out.push(`       ${f.title}. ${f.plain}`);
      if (f.detail) out.push(`       Fix: ${f.detail}`);
    }
    out.push('');
  }
  const protectedNote = summary.tables ? `${summary.tablesProtected}/${summary.tables} tables protected` : 'no SQL tables found';
  const routeNote = summary.routes ? `${summary.routesWithAuth}/${summary.routes} routes check auth` : 'no API routes found';
  if (result.ready) {
    out.push(`READY  ${counts.medium ? counts.medium + ' medium to tidy, ' : ''}${protectedNote}, ${routeNote}.`);
    out.push('This is a code check, not a full audit. Rotate any key that was ever committed.');
  } else {
    out.push(`NOT READY  ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium. ${protectedNote}, ${routeNote}. Fix critical first.`);
  }
  return out.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const all = args.includes('--all');
  const dir = args.find(a => !a.startsWith('--')) || '.';
  if (!existsSync(dir)) { console.error(`seatbelt: no such directory: ${dir}`); process.exit(2); }
  const result = scan(dir, { all });
  console.log(json ? JSON.stringify(result, null, 2) : format(result));
  process.exit(result.ready ? 0 : 1);
}
