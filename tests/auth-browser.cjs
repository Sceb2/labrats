'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {chromium} = require('playwright');
const {createClient} = require('@supabase/supabase-js');
const {generateUsername, generatePassword, provisionStudent} = require('../scripts/account-service.cjs');
const {buildLoginPilot} = require('../scripts/build-login-pilot.cjs');
const url = process.env.SUPABASE_TEST_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Use the disposable local test stack.');
const key = process.env.SUPABASE_TEST_ANON_KEY, secret = process.env.SUPABASE_TEST_SERVICE_KEY;
const root = path.resolve(__dirname, '..');

test('student browser login lifecycle and existing practice', async t => {
  const admin = createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}});
  // Longer than the previous 20-character input limit.
  const username = 'adventurous-hummingbird', password = generatePassword();
  const userId = await provisionStudent(admin, {username, password});
  let pilotDocument;
  // Serve at a subpath like GitHub Pages. Only the local test configuration and CSP origin differ.
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!pathname.startsWith('/revision/')) {res.writeHead(404); res.end(); return;}
      const relative = pathname.slice('/revision/'.length) || 'index.html';
      if (relative === 'standalone-pilot.html' && pilotDocument) {
        res.setHeader('Content-Type', 'text/html');
        res.end(pilotDocument); return;
      }
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || relative.startsWith('.') || !/\.(html|js|css|json|svg|wav)$/.test(file)) {res.writeHead(404); res.end(); return;}
      let body;
      if (relative === 'auth-config.json') body = Buffer.from(JSON.stringify({supabaseUrl: url, publishableKey: key}));
      else {
        body = await fs.readFile(file);
        if (relative === 'student-login.html') body = Buffer.from(body.toString().replace('https://ojhckvbekzudphkjeofw.supabase.co', url));
      }
      res.setHeader('Content-Type', {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.wav': 'audio/wav'}[path.extname(file)]);
      res.end(body);
    } catch {res.writeHead(404); res.end();}
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}/revision/`;
    browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
    const context = await browser.newContext();
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const errors = [], refreshes = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
    page.on('request', req => {if (req.url().includes('grant_type=refresh_token')) refreshes.push(true);});
    const ready = () => page.waitForFunction(() => !document.querySelector('#login-form').hidden);
    const visibleText = async (selector, pattern) => {
      await page.waitForFunction(({selector, source}) => new RegExp(source).test(document.querySelector(selector).textContent), {selector, source: pattern.source});
    };
    let failed;
    async function check(name, fn) {
      await t.test(name, async () => {
        try { await fn(); } catch (error) {
          failed = error; console.error('Account status:', await page.locator('#auth-status').innerText());
          throw error;
        }
      });
      if (failed) throw new Error('Browser flow stopped after a failed check.');
    }
    await check('login works under a Pages subpath without touching existing browser progress', async () => {
      await page.goto(base + 'student-login.html'); await ready();
      await page.evaluate(() => localStorage.setItem('ocrOrgProgressV2', JSON.stringify({existing: 'keep this progress'})));
      await page.locator('#username').fill(username);
      await page.locator('#password').fill('incorrect-password'); await page.locator('#login-form button').click();
      await visibleText('#auth-status', /Sign-in was unsuccessful/);
      assert.equal(await page.locator('#password').inputValue(), '');
      await page.locator('#password').fill(password); await page.locator('#login-form button').click();
      await page.waitForSelector('#account-panel:not([hidden])');
      assert.equal(await page.locator('#continue-practice').isVisible(), false);
      assert.equal(await page.locator('#password-form').isVisible(), true);
      assert.equal(await page.locator('#change-password-toggle').isVisible(), false);
      assert.match(await page.locator('#account-message').innerText(), /Choose your own password/);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ocrOrgProgressV2')).existing), 'keep this progress');
      assert.equal(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('ocr-student-auth'))), false);
    });
    await check('password confirmation and first-login change are enforced', async () => {
      const next = generatePassword().slice(0, 10);
      await page.locator('#new-password').fill(next); await page.locator('#confirm-password').fill(next + 'x');
      await page.locator('#password-form button').click(); await visibleText('#auth-status', /do not match/);
      await page.locator('#confirm-password').fill(next); await page.locator('#password-form button').click();
      await visibleText('#auth-status', /Password saved/);
      assert.equal(await page.locator('#continue-practice').isVisible(), true);
      assert.equal(await page.locator('#password-form').isVisible(), false);
      const {data, error} = await admin.from('account_profiles').select('must_change_password').eq('user_id', userId).single();
      assert.equal(error, null); assert.equal(data.must_change_password, false);
    });
    await check('session restores on reload and expires independently in another tab', async () => {
      await page.reload(); await visibleText('#auth-status', /Sign-in restored/);
      assert.equal(await page.locator('#password-form').isVisible(), false);
      assert.equal(await page.locator('#continue-practice').isVisible(), true);
      const other = await context.newPage(); await other.goto(base + 'student-login.html');
      await other.waitForSelector('#login-form:not([hidden])'); assert.equal(await other.locator('#account-panel').isVisible(), false); await other.close();
    });
    await check('returning students continue without a password change and can opt in to changing it', async () => {
      await page.locator('#change-password-toggle').click();
      await page.locator('#new-password').fill('Unsubmitted-new-password');
      await page.locator('#change-password-toggle').click();
      assert.equal(await page.locator('#password-form').isVisible(), false);
      assert.equal(await page.locator('#new-password').inputValue(), '');
      assert.equal(await page.locator('#continue-practice').isVisible(), true);
      await page.locator('#change-password-toggle').click();
      const changed = generatePassword().slice(0, 10);
      await page.locator('#new-password').fill(changed);
      await page.locator('#confirm-password').fill(changed);
      await page.locator('#password-form button').click(); await visibleText('#auth-status', /Password saved/);
      assert.equal(await page.locator('#password-form').isVisible(), false);
      assert.equal(await page.locator('#continue-practice').isVisible(), true);
      await page.locator('#sign-out').click(); await ready();
      await page.locator('#username').fill(username); await page.locator('#password').fill(changed);
      await page.locator('#login-form button').click(); await page.waitForSelector('#account-panel:not([hidden])');
      assert.equal(await page.locator('#password-form').isVisible(), false);
      assert.equal(await page.locator('#continue-practice').isVisible(), true);
      const {data, error} = await admin.from('account_profiles').select('must_change_password').eq('user_id', userId).single();
      assert.equal(error, null); assert.equal(data.must_change_password, false);
    });
    await check('expired access credentials refresh through real Supabase Auth', async () => {
      await page.evaluate(() => {
        const name = Object.keys(sessionStorage).find(k => k.startsWith('ocr-student-auth-v1-') && !k.endsWith('-user'));
        const session = JSON.parse(sessionStorage.getItem(name)); session.expires_at = Math.floor(Date.now() / 1000) - 10;
        sessionStorage.setItem(name, JSON.stringify(session));
      });
      await page.reload(); await visibleText('#auth-status', /Sign-in restored/); assert.ok(refreshes.length > 0);
    });
    await check('mobile layout has no horizontal overflow', async () => {
      await page.setViewportSize({width: 320, height: 800});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1), false);
    });
    await check('offline sign-out clears this tab without erasing legacy progress', async () => {
      await page.route('**/auth/v1/logout*', route => route.fulfill({status: 503, contentType: 'application/json', body: '{}'}));
      await page.locator('#sign-out').click(); await visibleText('#auth-status', /Signed out/);
      assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(k => k.startsWith('ocr-student-auth-v1-'))), false);
      await page.reload(); await ready();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ocrOrgProgressV2')).existing), 'keep this progress');
      await page.unroute('**/auth/v1/logout*');
    });
    await check('server credentials in public configuration are rejected before any login', async () => {
      await page.route('**/auth-config.json', route => route.fulfill({contentType: 'application/json', body: JSON.stringify({supabaseUrl: url, publishableKey: 'sb_secret_do-not-use'})}));
      await page.reload(); await visibleText('#auth-status', /Sign-in is unavailable/);
      assert.equal(await page.locator('#login-form').isVisible(), false); await page.unroute('**/auth-config.json');
    });
    await check('standalone pilot works with real Auth, blocked storage and no neighbouring assets', async () => {
      const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-login-file-'));
      const login = {username: generateUsername(), password: generatePassword()};
      const id = await provisionStudent(admin, login);
      const pilot = await browser.newPage(); pilot.setDefaultTimeout(15000);
      const requests = []; pilot.on('request', req => requests.push(req.url()));
      pilot.on('pageerror', error => errors.push(error.message));
      try {
        const filename = path.join(folder, 'student-login-pilot.html');
        buildLoginPilot({supabaseUrl: url, publishableKey: key}, filename);
        // Managed cloud Chromium blocks file: and srcdoc navigation. Test the exact
        // generated document over HTTP; opening the downloaded file remains a manual check.
        pilotDocument = await fs.readFile(filename, 'utf8');
        await pilot.addInitScript(() => {
          Object.defineProperty(window, 'sessionStorage', {get() {throw new Error('Storage unavailable');}});
          Object.defineProperty(navigator, 'locks', {get() {throw new DOMException('Opaque origin', 'SecurityError');}});
        });
        await pilot.goto(base + 'standalone-pilot.html');
        await pilot.waitForSelector('#login-form:not([hidden])');
        await pilot.locator('#username').fill(login.username); await pilot.locator('#password').fill(login.password);
        await pilot.locator('#login-form button').click(); await pilot.waitForSelector('#account-panel:not([hidden])');
        assert.match(await pilot.locator('#account-message').innerText(), /Choose your own password/);
        const changed = generatePassword().slice(0, 10);
        await pilot.locator('#new-password').fill(changed); await pilot.locator('#confirm-password').fill(changed);
        await pilot.locator('#password-form button').click();
        await pilot.waitForFunction(() => document.querySelector('#auth-status').textContent.includes('Password saved'));
        await pilot.locator('#sign-out').click(); await pilot.waitForSelector('#login-form:not([hidden])');
        await pilot.locator('#password').fill(changed); await pilot.locator('#login-form button').click();
        await pilot.waitForSelector('#account-panel:not([hidden])');
        assert.match(await pilot.locator('#account-message').innerText(), /You are signed in/);
        assert.equal(await pilot.locator('a[href="index.html"]').count(), 0);
        assert.equal(requests.some(request => request.includes('auth-config.json')), false);
        assert.ok(requests.every(request => request === base + 'standalone-pilot.html' || request.startsWith(url + '/')));
        await pilot.locator('#sign-out').click();
      } finally {
        await pilot.close(); await admin.auth.admin.deleteUser(id);
        pilotDocument = null;
        await fs.rm(folder, {recursive: true, force: true});
      }
    });
    await check('existing hosted suite and browser-only marking continue to work', async () => {
      const original = await browser.newPage();
      original.on('pageerror', e => errors.push(e.message));
      await original.goto(base + 'tests.html');
      await original.waitForFunction(() => {
        const counts=document.querySelector('#summary').textContent.match(/^(\d+)\/(\d+) software checks passed/);
        return counts&&Number(counts[1])>0&&counts[1]===counts[2];
      });
      assert.equal(await original.locator('.fail').count(), 0);
      await original.goto(base + 'index.html?preview=RC01');
      await original.locator('#reagent').selectOption('dichromate-acid'); await original.locator('#heating').selectOption('distil');
      await original.locator('#submit').click(); assert.match(await original.locator('#fb').innerText(), /2\s*\/\s*2 marks/);
      await original.close(); assert.deepEqual(errors, []);
    });
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    await admin.auth.admin.deleteUser(userId);
  }
});
