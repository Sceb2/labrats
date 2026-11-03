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
const {buildSitePreview} = require('../scripts/build-site-preview.cjs');
const bank = require('../questions.json');
const url = process.env.SUPABASE_TEST_URL, key = process.env.SUPABASE_TEST_ANON_KEY;
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use disposable local Auth only.');

test('full downloadable preview runs normal practice, offline sync and account isolation', async () => {
  const admin = createClient(url, process.env.SUPABASE_TEST_SERVICE_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
  const credentials = [0, 1].map(() => ({username: generateUsername(), password: generatePassword()}));
  const ids = [];
  let folder, browser, server;
  try {
    for (const credential of credentials) {
      const id = await provisionStudent(admin, {username: credential.username, password: generatePassword()}); ids.push(id);
      assert.equal((await admin.auth.admin.updateUserById(id, {password: credential.password})).error, null);
    }
    folder = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-site-preview-'));
    const filename = path.join(folder, 'preview.html');
    buildSitePreview({supabaseUrl: url, publishableKey: key}, filename);
    const document = await fs.readFile(filename);
    server = http.createServer((req, res) => {
      if (req.url !== '/preview.html') {res.writeHead(404); res.end(); return;}
      res.setHeader('Content-Type', 'text/html'); res.end(document);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = `http://127.0.0.1:${server.address().port}/preview.html`;
    browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox']});
    const context = await browser.newContext(), secondContext = await browser.newContext({viewport: {width: 390, height: 844}});
    const page = await context.newPage(), second = await secondContext.newPage();
    const errors = [], violations = [], requests = [], payloads = [];
    for (const p of [page, second]) {
      p.setDefaultTimeout(20000);
      p.on('pageerror', error => errors.push(error.message));
      p.on('console', message => {if (/Content Security Policy|Refused to/.test(message.text())) violations.push(message.text());});
      p.on('request', request => {
        requests.push(request.url());
        if (request.url().endsWith('/rpc/sync_learning_attempts')) payloads.push(request.postDataJSON());
      });
    }
    await second.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {get() {throw new Error('Unavailable storage');}});
      Object.defineProperty(navigator, 'locks', {get() {throw new DOMException('Opaque origin', 'SecurityError');}});
    });
    const saved = p => p.waitForFunction(() => document.querySelector('#account-sync-status')?.textContent === 'All progress saved to your account.');
    const signIn = async (p, credential) => {
      await p.goto(address);
      await p.locator('#username').fill(credential.username); await p.locator('#password').fill(credential.password);
      await p.locator('#login-form button').click();
      await p.waitForSelector('#account-panel:not([hidden])');
      await p.locator('#continue-practice').click();
      await p.waitForSelector('#practice'); await saved(p);
    };
    await page.goto(address);
    const guest = JSON.stringify({bankVersion: bank.meta.bankVersion, scoringVersion: bank.meta.scoringVersion,
      records: {RC05: {first: {score: 1, max: 1, outcome: 'correct'}}}, sessions: [], bests: {}});
    await page.evaluate(value => localStorage.setItem('ocrOrgProgressV2', value), guest);
    await signIn(page, credentials[0]);
    assert.equal(await page.evaluate(() => S.bank.questions.length), bank.questions.length);
    assert.deepEqual(await page.evaluate(() => Object.keys(S.progress.records)), []);
    await page.locator('[data-topic="alcohols"]').check();
    await page.locator('.practice-settings > summary').click();
    for (const type of ['multistep', 'mechanism-id', 'mechanism-completion', 'sites', 'nomenclature', 'product']) await page.locator(`[data-type="${type}"]`).uncheck();
    await page.locator('#celebration-effects').uncheck();
    await page.locator('#practice').click(); await page.waitForSelector('#submit');
    assert.equal(await page.evaluate(() => S.session.mode), 'practice');
    await page.waitForFunction(() => [...document.querySelectorAll('#app img')].length > 0 && [...document.querySelectorAll('#app img')].every(image => image.complete && image.naturalWidth > 0));
    const question = await page.evaluate(() => current());
    for (const component of question.components) await page.locator(`#${component.id}`).selectOption(question.validMethods[0].answers[component.id][0]);
    await context.setOffline(true);
    await page.locator('#submit').click();
    await page.waitForFunction(() => document.querySelector('#account-sync-status').textContent.includes('waiting'));
    const before = await admin.from('learning_attempts').select('*').eq('student_id', ids[0]);
    assert.equal(before.error, null); assert.equal(before.data.length, 0);
    const local = await page.evaluate(() => Object.entries(sessionStorage).filter(([name]) => name.startsWith('ocr-learning-')).map(([,value]) => value).join(''));
    assert.equal(local.includes('response'), false); assert.equal(local.includes('selected'), false);
    for (const component of question.components) assert.equal(local.includes(question.validMethods[0].answers[component.id][0]), false);
    await context.setOffline(false); await saved(page);
    const stored = await admin.from('learning_attempts').select('*').eq('student_id', ids[0]);
    assert.equal(stored.error, null); assert.equal(stored.data.length, 1);
    assert.equal(stored.data[0].session_mode, 'practice'); assert.equal(stored.data[0].earned_marks, question.maxMark);
    assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),`${question.maxMark} of ${question.maxMark} marks`);
    assert.equal(await page.locator('#fb .feedback-points').getAttribute('open'),null);
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:'/tmp/labrats-abc-account-full.png',fullPage:true});
    await page.setViewportSize({width:1280,height:900});

    await page.locator('#practice-sign-out').click();
    await page.waitForSelector('#login-form:not([hidden])');
    await signIn(page, credentials[0]);
    assert.equal(await page.evaluate(id => S.progress.records[id].first.score, question.id), question.maxMark);
    await signIn(second, credentials[0]);
    assert.equal(await second.evaluate(id => S.progress.records[id].first.score, question.id), question.maxMark);
    // Switch account through the real sign-out path. No marks from the first
    // account or browser-only history appear for this second student.
    await page.locator('#practice-sign-out').click();
    await page.waitForSelector('#login-form:not([hidden])');
    await signIn(page, credentials[1]);
    assert.deepEqual(await page.evaluate(() => Object.keys(S.progress.records)), []);
    assert.equal(await page.evaluate(() => localStorage.getItem('ocrOrgProgressV2')), guest);
    for (const payload of payloads) for (const event of payload.events) {
      assert.equal(Object.keys(event).length, 13); assert.equal('response' in event, false);
    }
    assert.ok(requests.every(request => request === address || request.startsWith(url + '/') || request.startsWith('data:')));
    assert.deepEqual(errors, []); assert.deepEqual(violations, []);
    await page.locator('#practice-sign-out').click();
    await page.waitForSelector('#login-form:not([hidden])');
    await page.locator('#preview-login header a').click();
    await page.waitForSelector('#practice');
    assert.equal(await page.locator('#account-sync-bar').count(), 0);
    assert.equal(await page.evaluate(() => S.progress.records.RC05.first.score), 1);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    if (folder) await fs.rm(folder, {recursive: true, force: true});
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});
