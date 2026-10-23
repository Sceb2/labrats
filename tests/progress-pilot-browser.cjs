'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {chromium} = require('playwright');
const {createClient} = require('@supabase/supabase-js');
const {generateUsername, generatePassword, provisionStudent} = require('../scripts/account-service.cjs');
const {buildProgressPilot} = require('../scripts/build-progress-pilot.cjs');
const url = process.env.SUPABASE_TEST_URL, key = process.env.SUPABASE_TEST_ANON_KEY;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use disposable local Auth only.');

test('downloadable progress pilot uses real Auth, marking and offline sync without neighbouring files', async () => {
  const admin = createClient(url, process.env.SUPABASE_TEST_SERVICE_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
  const credential = {username: generateUsername(), password: generatePassword()};
  const id = await provisionStudent(admin, {username: credential.username, password: generatePassword()});
  let folder, browser, server;
  try {
    assert.equal((await admin.auth.admin.updateUserById(id, {password: credential.password})).error, null);
    folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-progress-pilot-'));
    const filename = path.join(folder, 'pilot.html');
    buildProgressPilot({supabaseUrl: url, publishableKey: key}, filename);
    const document = await fs.readFile(filename);
    server = http.createServer((req, res) => {
      if (req.url !== '/pilot.html') {res.writeHead(404); res.end(); return;}
      res.setHeader('Content-Type', 'text/html'); res.end(document);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = `http://127.0.0.1:${server.address().port}/pilot.html`;
    browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox']});
    const context = await browser.newContext(), secondContext = await browser.newContext();
    const page = await context.newPage(), second = await secondContext.newPage();
    const errors = [], requests = [], payloads = [];
    for (const p of [page, second]) {
      p.setDefaultTimeout(20000);
      p.on('pageerror', error => errors.push(error.message));
      p.on('request', request => {
        requests.push(request.url());
        if (request.url().endsWith('/rpc/sync_learning_attempts')) payloads.push(request.postDataJSON());
      });
    }
    // This also exercises the same in-memory account client shared by both bundles.
    await second.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {get() {throw new Error('Unavailable storage');}});
      Object.defineProperty(navigator, 'locks', {get() {throw new DOMException('Opaque origin', 'SecurityError');}});
    });
    const signIn = async p => {
      await p.goto(address);
      await p.locator('#username').fill(credential.username);
      await p.locator('#password').fill(credential.password);
      await p.locator('#login-form button').click();
      await p.waitForSelector('#account-panel:not([hidden])');
      await p.locator('#continue-practice').click();
      await p.waitForSelector('#progress-pilot:not([hidden])');
      await saved(p);
    };
    const saved = p => p.waitForFunction(() => document.querySelector('#account-sync-status')?.textContent === 'All progress saved to your account.');
    const answer = async p => {
      await p.locator('#test-reagent').selectOption('dichromate-acid');
      await p.locator('#test-heating').selectOption('distil');
      await p.locator('#test-answer-form button').click();
    };
    await signIn(page);
    assert.equal(await page.locator('#saved-attempts').innerText(), '0');
    await context.setOffline(true);
    await answer(page);
    await page.waitForFunction(() => document.querySelector('#account-sync-status').textContent.includes('waiting'));
    const before = await admin.from('learning_attempts').select('*').eq('student_id', id);
    assert.equal(before.error, null); assert.equal(before.data.length, 0);
    const cache = await page.evaluate(() => Object.values(sessionStorage).join(''));
    assert.equal(cache.includes('dichromate-acid'), false);
    await context.setOffline(false); await saved(page);
    assert.equal(await page.locator('#saved-first-mark').innerText(), '2 / 2');
    assert.equal(await page.locator('#test-reagent').inputValue(), '');
    const stored = await admin.from('learning_attempts').select('*').eq('student_id', id);
    assert.equal(stored.error, null); assert.equal(stored.data.length, 1);
    assert.equal(stored.data[0].earned_marks, 2);
    await page.locator('#practice-sign-out').click();
    await page.waitForSelector('#login-form:not([hidden])');
    assert.equal(await page.locator('#progress-pilot').isVisible(), false);
    assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(name => name.startsWith('ocr-learning-'))), false);
    await signIn(page);
    assert.equal(await page.locator('#saved-attempts').innerText(), '1');
    assert.equal(await page.locator('#saved-first-mark').innerText(), '2 / 2');
    await signIn(second);
    assert.equal(await second.locator('#saved-attempts').innerText(), '1');
    await second.locator('#test-reveal').click(); await saved(second);
    assert.equal(await second.locator('#saved-revealed').innerText(), 'Yes');
    await answer(second); await saved(second);
    const after = await admin.from('learning_attempts').select('*').eq('student_id', id).order('sequence');
    assert.equal(after.error, null); assert.equal(after.data.length, 3);
    assert.equal(after.data.find(row => row.answer_revealed && row.kind === 'submit')?.earned_marks, 2);
    for (const payload of payloads) for (const event of payload.events) {
      assert.equal(Object.keys(event).length, 13); assert.equal('response' in event, false);
    }
    assert.ok(requests.every(request => request === address || request.startsWith(url + '/')));
    assert.deepEqual(errors, []);
    await second.locator('#practice-sign-out').click();
    await second.waitForSelector('#login-form:not([hidden])');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (folder) await fs.rm(folder, {recursive: true, force: true});
    await admin.auth.admin.deleteUser(id);
  }
});
