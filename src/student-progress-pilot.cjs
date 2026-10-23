'use strict';
// The download shares the real login and sync implementations, including their
// in-memory storage fallback. Only public configuration/question data is embedded.
require('./student-login.cjs');
require('./progress-sync.cjs');
const C = require('../core.js');
const bank = window.OCR_PROGRESS_PILOT_BANK;
const question = bank.questions[0];
const $ = selector => document.querySelector(selector);
let sync, starting = false;
const encounter = {mode: 'practice'};
function showRecords(records) {
  const record = records[question.id];
  $('#saved-first-mark').textContent = record?.first
    ? `${record.first.score} / ${record.first.max}` : 'No unaided first answer recorded';
  $('#saved-attempts').textContent = String(record?.attempts || 0);
  $('#saved-revealed').textContent = record?.revealed ? 'Yes' : 'No';
}
$('#continue-practice').addEventListener('click', async event => {
  event.preventDefault();
  if (starting || sync) return;
  starting = true;
  $('#auth-status').textContent = 'Opening progress test…';
  try {
    sync = await window.RevisionSync.open(bank, showRecords, {
      navigate: () => location.reload(), loginUrl: location.href
    });
    if (!sync) throw new Error('Sign in before opening the progress test.');
    $('.login-card').hidden = true;
    $('#progress-pilot').hidden = false;
    showRecords(sync.records());
    $('#test-question-heading').focus();
  } catch (error) {$('#auth-status').textContent = error.message;}
  finally {starting = false;}
});
$('#test-answer-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!sync) return;
  const response = Object.fromEntries(new FormData(event.currentTarget));
  const result = C.mark(question, response, bank);
  sync.record(question, encounter, 'submit', result);
  $('#test-result').textContent = `This answer: ${result.score} / ${result.max} marks. ${question.feedback}`;
  // Responses and detailed marking results are never put into browser storage.
  event.currentTarget.reset();
});
$('#test-reveal').addEventListener('click', () => {
  if (!sync) return;
  sync.record(question, encounter, 'reveal');
  $('#test-result').textContent = question.feedback;
});
