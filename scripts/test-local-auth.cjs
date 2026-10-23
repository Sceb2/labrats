#!/usr/bin/env node
'use strict';
// Disposable real GoTrue + PostgREST + PostgreSQL integration stack. No hosted credentials.
const {spawnSync, spawn} = require('node:child_process');
const {randomBytes, createHmac} = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const run = (args, options = {}) => {
  const r = spawnSync('docker', args, {encoding: 'utf8', ...options});
  if (r.status !== 0) throw new Error(`Docker ${args[0]} failed: ${r.stderr?.slice(0, 1200) || 'Docker is unavailable'}`);
  return r.stdout.trim();
};
const images = {
  db: 'postgres:17-alpine@sha256:eee6c6e1b0894fa4fe0075eb054af9fd1cf39a35321c2d4110626cfe506411fb',
  auth: 'supabase/gotrue:v2.180.0@sha256:1f378d415f670d59c7c2e52e244da6f0d486321998c6a6485e109efaeaba51ac',
  rest: 'postgrest/postgrest:v13.0.7@sha256:0a46780309a604cdc8b56c776c6e5e15788ce58174d709e40459ab5a2d44d228'
};
async function waitFor(check, label) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready within 60 seconds.`);
}
async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-local-auth-'));
  const suffix = randomBytes(5).toString('hex');
  const network = `ocr-auth-${suffix}`, names = [];
  let gateway;
  const secret = randomBytes(32).toString('hex'), password = randomBytes(24).toString('hex');
  const token = role => {
    const h = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
    const p = Buffer.from(JSON.stringify({role, iss: 'supabase', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600})).toString('base64url');
    return `${h}.${p}.${createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url')}`;
  };
  const envFile = (name, values) => {
    const file = path.join(dir, `${name}.env`);
    fs.writeFileSync(file, Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n'), {mode: 0o600}); return file;
  };
  const start = (type, values, port) => {
    const name = `ocr-${type}-${suffix}`;
    run(['run', '-d', '--name', name, '--network', network, '--network-alias', type, '--env-file', envFile(type, values),
      ...(port ? ['-p', `127.0.0.1::${port}`] : []), images[type]]);
    names.push(name); return name;
  };
  const portFor = (name, port) => Number(run(['port', name, String(port)]).split(':').pop());
  try {
    run(['network', 'create', network]);
    console.log('Starting disposable PostgreSQL, Supabase Auth and PostgREST.');
    const db = start('db', {POSTGRES_PASSWORD: password});
    await waitFor(() => spawnSync('docker', ['exec', db, 'pg_isready', '-U', 'postgres'], {stdio: 'ignore'}).status === 0, 'PostgreSQL');
    run(['exec', '-i', db, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {input: `
      create role anon nologin noinherit;
      create role authenticated nologin noinherit;
      create role service_role nologin noinherit bypassrls;
      create role authenticator login noinherit password '${password}';
      grant anon, authenticated, service_role to authenticator;
      create role supabase_auth_admin login noinherit createrole password '${password}';
      create schema auth authorization supabase_auth_admin;
      alter role supabase_auth_admin set search_path = auth, public;
      grant usage on schema public to anon, authenticated, service_role;
      grant usage on schema auth to anon, authenticated, service_role;
    `});
    // Gateway adds the same URL prefixes used by the hosted API; services still verify real JWTs.
    let authPort, restPort;
    gateway = http.createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {'access-control-allow-origin': '*',
          'access-control-allow-headers': req.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,x-supabase-api-version',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'});
        res.end(); return;
      }
      const isAuth = req.url.startsWith('/auth/v1/'), isRest = req.url.startsWith('/rest/v1/');
      if (!isAuth && !isRest) { res.writeHead(404); res.end(); return; }
      const upstream = http.request({host: '127.0.0.1', port: isAuth ? authPort : restPort,
        path: req.url.replace(isAuth ? '/auth/v1' : '/rest/v1', ''), method: req.method, headers: req.headers}, response => {
        res.writeHead(response.statusCode, {...response.headers, 'access-control-allow-origin': '*',
          'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,x-supabase-api-version',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'}); response.pipe(res);
      });
      upstream.on('error', () => {res.writeHead(502); res.end();}); req.pipe(upstream);
    });
    await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${gateway.address().port}`;
    const auth = start('auth', {
      GOTRUE_API_HOST: '0.0.0.0', GOTRUE_API_PORT: 9999, API_EXTERNAL_URL: `${url}/auth/v1`,
      GOTRUE_DB_DRIVER: 'postgres', GOTRUE_DB_DATABASE_URL: `postgres://supabase_auth_admin:${password}@db:5432/postgres?sslmode=disable`,
      GOTRUE_DB_NAMESPACE: 'auth', GOTRUE_SITE_URL: 'http://127.0.0.1:8000', GOTRUE_DISABLE_SIGNUP: 'true',
      GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true', GOTRUE_MAILER_AUTOCONFIRM: 'true', GOTRUE_PASSWORD_MIN_LENGTH: 10,
      GOTRUE_JWT_SECRET: secret, GOTRUE_JWT_EXP: 3600, GOTRUE_JWT_AUD: 'authenticated',
      GOTRUE_JWT_ADMIN_ROLES: 'service_role', GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
      GOTRUE_RATE_LIMIT_EMAIL_SENT: 100, GOTRUE_RATE_LIMIT_TOKEN_VERIFICATIONS: 1000,
      GOTRUE_RATE_LIMIT_SIGN_IN_SIGN_UPS: 1000, GOTRUE_RATE_LIMIT_TOKEN_REFRESH: 1000,
      GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: 'true', GOTRUE_LOG_LEVEL: 'error'
    }, 9999);
    authPort = portFor(auth, 9999);
    await waitFor(async () => {
      if (run(['inspect', '--format', '{{.State.Status}}', auth]) === 'exited') throw new Error('Supabase Auth exited during startup.');
      try { return (await fetch(`http://127.0.0.1:${authPort}/health`)).ok; } catch { return false; }
    }, 'Supabase Auth');
    // Auth's own migrations install an older uid() helper. Match hosted PostgREST claims.
    run(['exec', '-i', db, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {input: `
      create or replace function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claims'', true)::jsonb ->> ''sub'', '''')::uuid';
      create or replace function auth.jwt() returns jsonb language sql stable as
        'select coalesce(nullif(current_setting(''request.jwt.claims'', true), '''')::jsonb, ''{}''::jsonb)';
    `});
    run(['exec', '-i', db, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input: fs.readdirSync(path.join(root,'supabase/migrations')).filter(name=>name.endsWith('.sql')).sort().map(name=>fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8')).join('\n')
    });
    const rest = start('rest', {PGRST_DB_URI: `postgres://authenticator:${password}@db:5432/postgres`,
      PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'anon', PGRST_JWT_SECRET: secret}, 3000);
    restPort = portFor(rest, 3000);
    await waitFor(async () => { try { return (await fetch(`${url}/rest/v1/`)).ok; } catch { return false; } }, 'PostgREST');
    const env = {...process.env, SUPABASE_TEST_URL: url, SUPABASE_TEST_ANON_KEY: token('anon'), SUPABASE_TEST_SERVICE_KEY: token('service_role')};
    for (const file of ['tests/auth-integration.cjs', 'tests/progress-integration.cjs', 'tests/auth-browser.cjs', 'tests/progress-browser.cjs', 'tests/progress-pilot-browser.cjs']) {
      const code = await new Promise(resolve => {
        const child = spawn(process.execPath, ['--test', file], {cwd: root, env, stdio: 'inherit'});
        child.on('exit', resolve);
      });
      if (code !== 0) throw new Error(`${file} failed.`);
    }
    console.log('Real local Auth and browser checks passed. Disposing of test accounts and services.');
  } catch (error) {
    for (const name of names) {
      const r = spawnSync('docker', ['logs', '--tail', '12', name], {encoding: 'utf8'});
      const clean = ((r.stdout || '') + (r.stderr || '')).replaceAll(password, '[local password]').replaceAll(secret, '[local signing key]');
      console.error(`${name}: ${clean}`);
    }
    throw error;
  } finally {
    if (gateway) await new Promise(resolve => gateway.close(resolve));
    for (const name of names.reverse()) spawnSync('docker', ['rm', '-f', '-v', name], {stdio: 'ignore'});
    spawnSync('docker', ['network', 'rm', network], {stdio: 'ignore'});
    fs.rmSync(dir, {recursive: true, force: true});
  }
}
main().catch(error => {console.error(error.message); process.exitCode = 1;});
