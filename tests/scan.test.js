import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, format, CHECKS } from '../skills/seatbelt/scripts/scan.js';

const here = dirname(fileURLToPath(import.meta.url));
const LEAKY = join(here, '..', 'examples', 'leaky-app');
const SAFE = join(here, '..', 'examples', 'safe-app');

// Every planted issue in examples/leaky-app, keyed by check id -> file path(s) it must be found in.
const PLANTED = {
  R01: ['.env'],
  R02: ['.env'],
  D02: ['.env', 'src/components/AdminPanel.jsx'],
  D01: ['src/components/AdminPanel.jsx'],
  D03: ['supabase/migrations/0001_init.sql'],
  D04: ['firestore.rules'],
  S01: ['src/lib/openai.js'],
  S02: ['src/lib/stripe.js'],
  S07: ['src/lib/supabase.js'],
  S08: ['src/lib/jwt.js'],
  S09: ['src/lib/mailer.js'],
  W01: ['next.config.js'],
  W02: ['src/app/api/posts/route.js', 'src/app/api/admin/users/route.js'],
  W03: ['src/components/Comment.jsx'],
  W04: ['src/lib/formula.js'],
  W05: ['src/app/api/stripe/webhook/route.js'],
  W06: ['src/lib/db.js'],
  W07: ['config/production.json'],
};

test('leaky-app: every planted issue is found', () => {
  const r = scan(LEAKY);
  assert.equal(r.ready, false);
  for (const [id, files] of Object.entries(PLANTED)) {
    for (const f of files) {
      assert.ok(r.findings.some(x => x.id === id && x.file === f), `${id} not found in ${f}`);
    }
  }
});

test('leaky-app: no findings outside the planted set', () => {
  const r = scan(LEAKY);
  for (const f of r.findings) {
    assert.ok(PLANTED[f.id]?.includes(f.file), `unexpected ${f.id} in ${f.file}:${f.line}`);
  }
});

test('leaky-app: generic S09 does not double-report a line already caught by a specific key check', () => {
  const r = scan(LEAKY);
  assert.ok(!r.findings.some(f => f.id === 'S09' && f.file === 'src/lib/openai.js'));
});

test('leaky-app: routes with auth are counted, routes without are flagged', () => {
  const r = scan(LEAKY);
  assert.equal(r.summary.routes, 4);
  assert.equal(r.summary.routesWithAuth, 2); // /api/me has getUser, webhook is exempt
  assert.equal(r.summary.tables, 2);
  assert.equal(r.summary.tablesProtected, 1);
});

test('safe-app: zero findings and READY', () => {
  const r = scan(SAFE);
  assert.deepEqual(r.findings, []);
  assert.equal(r.ready, true);
  assert.equal(r.summary.tables, 2);
  assert.equal(r.summary.tablesProtected, 2);
  assert.equal(r.summary.routes, 4);
  assert.equal(r.summary.routesWithAuth, 4);
  assert.match(format(r), /^READY/m);
});

test('format: NOT READY verdict lists counts', () => {
  const out = format(scan(LEAKY));
  assert.match(out, /NOT READY\s+\d+ critical, \d+ high, \d+ medium/);
  assert.match(out, /CRITICAL \(\d+\)/);
});

// ---- Checks not planted in the committed fixture (their fake keys would trip GitHub push protection)

function tmpProject(files) {
  const dir = mkdtempSync(join(tmpdir(), 'seatbelt-'));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  }
  return dir;
}
function ids(dir) { const r = scan(dir); rmSync(dir, { recursive: true, force: true }); return r.findings.map(f => f.id); }

test('S03 AWS access key', () => {
  assert.ok(ids(tmpProject({ 'src/s3.js': "const key = 'AKIAJQ7ZXK5T2M9PLW3B';" })).includes('S03'));
});
test('S04 Google API key', () => {
  assert.ok(ids(tmpProject({ 'src/maps.js': "const k = 'AIzaSyA1234567890abcdefghijklmnopqrstuv';" })).includes('S04'));
});
test('S05 GitHub token', () => {
  assert.ok(ids(tmpProject({ 'src/gh.js': "const t = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';" })).includes('S05'));
});
test('S06 Slack token', () => {
  assert.ok(ids(tmpProject({ 'src/slack.js': "const t = 'xoxb-1234567890-abcdefghij';" })).includes('S06'));
});
test('S07 new-style Supabase secret key', () => {
  assert.ok(ids(tmpProject({ 'src/x.js': "const k = 'sb_secret_abcdefghijklmnop123';" })).includes('S07'));
});

// ---- Things that must NOT fire

test('placeholders are ignored', () => {
  const r = ids(tmpProject({
    'src/a.js': "const apiKey = 'your-api-key-here';\nconst s = 'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // example",
    '.env.example': 'OPENAI_API_KEY=sk-proj-your-key-here\nSUPABASE_SERVICE_ROLE_KEY=<paste here>',
  }));
  assert.deepEqual(r, []);
});

test('secrets inside an ignored .env do not fire, and .env.example satisfies R02', () => {
  const r = ids(tmpProject({
    '.gitignore': 'node_modules\n.env*\n',
    '.env': 'OPENAI_API_KEY=sk-proj-realLookingKey1234567890abcdef\nSTRIPE_SECRET_KEY=sk_live_abcdefghijklmnop123456',
    '.env.example': 'OPENAI_API_KEY=\nSTRIPE_SECRET_KEY=',
  }));
  assert.deepEqual(r, []);
});

test('seatbelt-ignore suppresses a line', () => {
  const r = ids(tmpProject({ 'src/a.js': "// seatbelt-ignore\nconst k = 'sk_live_abcdefghijklmnop123456';\nconst j = 'sk_live_abcdefghijklmnop654321'; // seatbelt-ignore" }));
  assert.deepEqual(r, []);
});

test('seatbelt: public marks a route as intentionally open', () => {
  const r = ids(tmpProject({ 'src/app/api/prices/route.js': "// seatbelt: public\nexport async function GET() { return Response.json([]); }" }));
  assert.ok(!r.includes('W02'));
});

test('server-only files may reference the service role key', () => {
  const r = ids(tmpProject({
    'src/lib/admin.ts': "import 'server-only';\nconst k = process.env.SUPABASE_SERVICE_ROLE_KEY;",
    'src/app/api/x/route.ts': "const k = process.env.SUPABASE_SERVICE_ROLE_KEY; export async function GET(req){ const auth = req.headers.get('authorization'); return new Response('ok'); }",
    'supabase/functions/job/index.ts': "const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');",
  }));
  assert.ok(!r.includes('D01'), `got ${r}`);
});

test('RLS: enable in a later migration counts, temp tables and migration tables are skipped', () => {
  const r = ids(tmpProject({
    'supabase/migrations/0001.sql': 'create table public.todos (id int);\ncreate temp table scratch (id int);\ncreate table _prisma_migrations (id text);',
    'supabase/migrations/0002.sql': 'alter table public.todos enable row level security;',
  }));
  assert.ok(!r.includes('D03'), `got ${r}`);
});

test('RLS: explicit disable is flagged', () => {
  const r = ids(tmpProject({ 'db/schema.sql': 'create table notes (id int);\nalter table notes enable row level security;\nalter table notes disable row level security;' }));
  assert.ok(r.includes('D03'));
});

test('sanitized HTML and literal HTML are fine', () => {
  const r = ids(tmpProject({
    'src/A.jsx': "<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(x) }} />\n<div dangerouslySetInnerHTML={{ __html: '<b>hi</b>' }} />\nel.innerHTML = '<p>static</p>';",
  }));
  assert.ok(!r.includes('W03'), `got ${r}`);
});

test('parameterized SQL and sql tagged templates are fine', () => {
  const r = ids(tmpProject({
    'src/db.js': "await pool.query('SELECT * FROM t WHERE id = $1', [id]);\nawait sql`select * from t where id = ${id}`;",
  }));
  assert.ok(!r.includes('W06'), `got ${r}`);
});

test('CORS with a real origin list is fine', () => {
  const r = ids(tmpProject({ 'server/index.js': "app.use(cors({ origin: ['https://myapp.com'], credentials: true }));" }));
  assert.ok(!r.includes('W01'));
});

test('test files do not trigger the generic secret check', () => {
  const r = ids(tmpProject({ 'tests/login.test.js': "const password = 'correct-horse-battery';" }));
  assert.ok(!r.includes('S09'));
});

test('every check id has a severity, title and plain-English consequence', () => {
  for (const [id, [sev, title, plain]] of Object.entries(CHECKS)) {
    assert.ok(['critical', 'high', 'medium'].includes(sev), id);
    assert.ok(title.length > 10 && plain.length > 20, id);
  }
});
