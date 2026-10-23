'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const esbuild = require('esbuild');
const {validatePublicConfig} = require('../src/student-identity.cjs');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const hash = value => createHash('sha256').update(value).digest('base64');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');

function buildProgressPilot(config = JSON.parse(read('auth-config.json')), output = path.join(root, 'student-progress-pilot.html')) {
  const {url, key} = validatePublicConfig(config);
  const source = JSON.parse(read('questions.json'));
  const question = source.questions.find(q => q.id === 'RC01');
  const vocabulary = Object.fromEntries(question.components.flatMap(c => c.options).map(id => [id, source.vocabulary[id]]));
  const bank = {meta: source.meta, questions: [question], vocabulary};
  const bundle = esbuild.buildSync({absWorkingDir: root, entryPoints: ['src/student-progress-pilot.cjs'],
    bundle: true, write: false, platform: 'browser', target: ['es2022'], minify: true,
    supported: {'template-literal': false}, legalComments: 'eof'}).outputFiles[0].text;
  // Local configuration only is intercepted; all actual Auth/API calls use fetch.
  const script = `(() => {\nconst originalFetch = window.fetch.bind(window);\nconst config = ${safeJSON({supabaseUrl: url, publishableKey: key})};\nwindow.fetch = (input, init) => input === 'auth-config.json'\n ? Promise.resolve(new Response(JSON.stringify(config), {headers: {'Content-Type': 'application/json'}}))\n : originalFetch(input, init);\nwindow.OCR_PROGRESS_PILOT_BANK = ${safeJSON(bank)};\n})();\n${bundle}`;
  const css = read('styles.css') + '\n' + read('student-login.css');
  if (/<\/script/i.test(script) || /<\/style/i.test(css)) throw new Error('Unsafe inline asset.');
  const policy = `default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(css)}'; connect-src ${url}; img-src data:; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const controls = question.components.map(component => `<label class="control" for="test-${escape(component.id)}">${escape(component.label)}<select id="test-${escape(component.id)}" name="${escape(component.id)}" required><option value="">Choose an answer</option>${component.options.map(id => `<option value="${escape(id)}">${escape(vocabulary[id].label)}</option>`).join('')}</select></label>`).join('\n');
  const test = `<section id="progress-pilot" class="card" hidden>
    <h1 id="test-question-heading" tabindex="-1">Progress saving test</h1>
    <p>Fictional accounts only. This saves practice marks for question RC01 to your development project. Your live website is unchanged.</p>
    <h2>Convert propan-1-ol into propanal</h2><p>Select the oxidising agent and collection method.</p>
    <form id="test-answer-form">${controls}<button class="btn" type="submit">Submit test answer</button></form>
    <button id="test-reveal" class="btn secondary" type="button">Reveal answer</button>
    <p id="test-result" role="status"></p>
    <h2>Account progress for RC01</h2>
    <dl><dt>First unaided mark</dt><dd id="saved-first-mark"></dd><dt>Number of submissions</dt><dd id="saved-attempts"></dd><dt>Answer ever revealed</dt><dd id="saved-revealed"></dd></dl>
    <p>Wait for “All progress saved to your account”, then sign out and sign back in. Open this test again: the submission count and first mark should return.</p>
    <p>These are account results. The first mark stays the same when you retry. This page checks saving; it does not replace the full practice website.</p>
  </section>`;
  let html = read('student-login.html')
    .replace(/content="default-src[^\"]*"/, `content="${policy}"`)
    .replace('<title>Student sign in · Organic chemistry</title>', '<title>Fictional student progress test · Organic chemistry</title>')
    .replace(/<link rel="stylesheet" href="styles\.css(?:\?v=[^"]*)?">\s*<link rel="stylesheet" href="student-login\.css(?:\?v=[^"]*)?">/, () => `<style>${css}</style>`)
    .replace('<a href="index.html">Continue browser-only practice</a>', '<span>Fictional student progress test</span>')
    .replace('<h1 id="login-heading">Student sign in</h1>', '<h1 id="login-heading">Test student sign in</h1>')
    .replace('Account pilot: signed-in practice saves new results to your account. Existing browser-only history stays separate and is not imported.', 'Fictional accounts only: sign in to test progress saving. Your live revision website is unchanged.')
    .replace('<a id="continue-practice" class="btn secondary" href="index.html" hidden>Continue browser-only practice</a>', '<a id="continue-practice" class="btn secondary" href="#progress-pilot" hidden>Open progress test</a>')
    .replace('</main>', () => `${test}\n</main>`)
    .replace(/<script src="student-login\.js(?:\?v=[^"]*)?" defer><\/script>/, () => `<script>${script}</script>`);
  if (html.includes('href="index.html"') || /<script src=|<link rel="stylesheet"/.test(html)) throw new Error('Progress pilot must be self-contained.');
  html = '<!-- Generated by npm run build:auth. Public configuration only; fictional accounts only. -->\n' + html.replace('</body>', () => `<template id="third-party-notices">${escape(read('THIRD_PARTY_NOTICES.md'))}</template>\n</body>`);
  fs.writeFileSync(output, html);
  return output;
}
if (require.main === module) buildProgressPilot();
module.exports = {buildProgressPilot};
