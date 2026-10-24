'use strict';
// A standalone content-review artefact, independent of the deployed bank/build.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'content-drafts/ocr-mechanism-markpoints.json'), 'utf8'));
const sources = new Map(pack.sources.map(source => [source.id, source]));
assert.equal(sources.size, 4);
assert.equal(pack.families.length, 4);
assert.deepEqual(pack.families.map(family => family.groups.length), [5, 4, 3, 4]);
const questions = [];
for (const family of pack.families) {
  assert(sources.has(family.sourceId));
  assert.equal(family.groups.length, sources.get(family.sourceId).marks);
  const groupIds = family.groups.map(group => group.id);
  assert.equal(new Set(groupIds).size, groupIds.length);
  assert.deepEqual(groupIds, family.groups.map((_, i) => `M${i + 1}`));
  const combinedId = `MP-${family.id}-ALL`;
  questions.push({ id: combinedId, family, mode: 'combined', marks: groupIds.length,
    prompt: family.combinedPrompt, groups: family.groups });
  for (const group of family.groups) {
    for (const field of ['label', 'sourceAward', 'prompt', 'modelAnswer', 'feedback']) assert(group[field]);
    assert(group.requirements.length > 0);
    assert(group.commonErrors.length > 0);
    questions.push({ id: `MP-${family.id}-${group.id}`, family, mode: 'focused', marks: 1,
      prompt: group.prompt, groups: [group] });
  }
}
assert.equal(questions.length, 20);
assert.equal(new Set(questions.map(q => q.id)).size, 20);
assert.equal(questions.filter(q => q.mode === 'focused').length, 16);
const pages = values => values.join(', ');
const md = [
  '# Organic mechanism question pack — teacher review draft', '',
  'Prepared 24 October 2026 using two GPT-6 Luna subagents for source-finding and scheme analysis, followed by parent authoring and independent checks of the uploaded PDFs and scheme diagrams.', '',
  '**20 original questions: four combined questions and 16 one-mark focused questions.** The focused questions repeat the same 16 marking groups; they are not 16 additional skills. The combined questions total 16 marks. The full pack offers 32 practice marks if both formats are completed.', '',
  pack.authorship, '', pack.delivery, '',
  'This document preserves the original drawing/self-marking draft. A separate auto-scored recognition adaptation is now available: see [the card preview guide](MECHANISM_CARD_PREVIEW.md). The drawing draft itself has not been imported as a freehand task.', '',
  'Open [the standalone review preview](../content-drafts/ocr-mechanism-review.html) in a browser, or inspect [the structured authoring data](../content-drafts/ocr-mechanism-markpoints.json). The preview can filter combined/focused cards and show or hide answer guidance. Draw on paper or a separate canvas; it does not capture answers or award marks.', '',
  '## What the source schemes award', '',
  pack.sourceVerification, '',
  'The summaries below paraphrase award groups rather than reproduce complete OCR questions or mark schemes. This is a selected four-example sample, not a complete survey of mechanism assessment.', ''
];
for (const family of pack.families) {
  const source = sources.get(family.sourceId);
  md.push(`### ${source.session}, ${source.component}, Q${source.question} — ${source.marks} marks`, '',
    `Source reaction: ${source.sourceReaction}`, '',
    `Question paper: \`${source.paperFile}\`, printed p. ${pages(source.paperPrintedPages)} (PDF p. ${pages(source.paperPdfPages)}). Mark scheme: \`${source.schemeFile}\`, printed pp. ${pages(source.schemePrintedPages)} (PDF pp. ${pages(source.schemePdfPages)}).`, '');
  for (const group of family.groups) md.push(`- **${group.id} (1 mark):** ${group.sourceAward}`);
  md.push('', '**Conditions that affect interpretation:**', '');
  for (const caveat of source.sourceCaveats) md.push(`- ${caveat}`);
  md.push('', `**Original-question adaptation:** ${family.transferNote}`, '');
}
md.push('## Original questions and answer guidance', '', pack.assessment, '',
  'Use the prompts without the answer guidance for an unaided attempt. Focused questions assess a complete marking group: when a group contains two or three linked features, they remain one mark. No extra point is awarded for an unrequested mechanism name or stability explanation.', '');
for (const family of pack.families) {
  md.push(`### ${family.title}`, '', `Reaction: ${family.reaction}`, '',
    `**Asset brief:** ${family.diagramBrief}`, '');
  for (const q of questions.filter(q => q.family.id === family.id)) {
    md.push(`#### ${q.id} — ${q.mode === 'combined' ? 'Combined mechanism' : q.groups[0].label} [${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}]`, '',
      `**Student prompt:** ${q.prompt}`, '', '**Answer and marking:**', '');
    for (const group of q.groups) {
      md.push(`- **${group.id}, 1 mark:** ${group.modelAnswer}`);
      if (group.requirements.length > 1) md.push(`  Required together: ${group.requirements.join(' ')}`);
      if (group.combinedMarkingNote && q.mode === 'combined') md.push(`  Teacher judgement: ${group.combinedMarkingNote}`);
    }
    md.push('', '**Common errors / feedback:**', '');
    for (const group of q.groups) md.push(`- **${group.id}:** ${group.commonErrors.join(' ')} ${group.feedback}`);
    md.push('');
  }
}
md.push('## Coverage map', '', '| Source group | Combined question | Focused question | Marks per format |', '|---|---|---|---|');
for (const family of pack.families) for (const group of family.groups)
  md.push(`| ${family.sourceId} ${group.id} | MP-${family.id}-ALL | MP-${family.id}-${group.id} | 1 |`);
md.push('', '## Integration and review boundaries', '');
for (const note of pack.toolIntegrationNotes) md.push(`- ${note}`);
md.push('', '## Source-file integrity', '', 'These hashes identify the uploaded bytes read; they are not evidence that an official web URL was fetched.', '',
  '| File | SHA-256 |', '|---|---|');
const files = new Map();
for (const source of pack.sources) {
  files.set(source.paperFile, source.paperSha256);
  files.set(source.schemeFile, source.schemeSha256);
}
for (const [filename, hash] of files) {
  assert.match(hash, /^[a-f0-9]{64}$/);
  md.push(`| ${filename} | \`${hash}\` |`);
}
md.push('');
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const list = values => `<ul>${values.map(value => `<li>${escape(value)}</li>`).join('')}</ul>`;
const cards = questions.map(q => {
  const source = sources.get(q.family.sourceId);
  return `<article class="card" data-mode="${q.mode}" id="${q.id}">
    <p class="eyebrow">${escape(q.id)} · ${q.mode} · ${q.marks} ${q.marks === 1 ? 'mark' : 'marks'}</p>
    <h2>${escape(q.family.title)}${q.mode === 'focused' ? ': ' + escape(q.groups[0].label) : ''}</h2>
    <p class="prompt">${escape(q.prompt)}</p>
    <p class="draw-note">Draw your answer on paper or a separate canvas before revealing the guidance.</p>
    <details class="answer"><summary>Show answer and marking guidance</summary>
      ${q.groups.map(group => `<section><h3>${escape(group.id)} — ${escape(group.label)} (1 mark)</h3>
      <p>${escape(group.modelAnswer)}</p><h4>Required for the mark</h4>${list(group.requirements)}
      ${group.combinedMarkingNote && q.mode === 'combined' ? `<p><strong>Teacher judgement:</strong> ${escape(group.combinedMarkingNote)}</p>` : ''}
      <h4>Common errors</h4>${list(group.commonErrors)}<p class="feedback">${escape(group.feedback)}</p></section>`).join('')}
    </details>
    <details class="source"><summary>Source and adaptation</summary>
      <p>Original practice inspired by ${escape(source.session)}, ${escape(source.component)}, Q${escape(source.question)}. Not an OCR question.</p>
      <p>Question printed p. ${pages(source.paperPrintedPages)} / PDF p. ${pages(source.paperPdfPages)}; scheme printed pp. ${pages(source.schemePrintedPages)} / PDF pp. ${pages(source.schemePdfPages)}.</p>
      <p>${escape(q.family.transferNote)}</p>${list(source.sourceCaveats)}
    </details>
  </article>`;
}).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Organic mechanism question pack — review</title>
<style>
:root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;color:#17212b;background:#f4f7f6;line-height:1.55}*{box-sizing:border-box}body{margin:0}main{max-width:960px;margin:auto;padding:24px}h1{font-size:2rem;line-height:1.2}h2{font-size:1.3rem}h3{font-size:1.05rem}h4{margin-bottom:0}.notice{background:#e6f1eb;border-left:4px solid #14563e;padding:14px 18px}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:22px 0}button,select{font:inherit;border:1px solid #63746c;border-radius:7px;background:white;padding:8px 12px;color:#17212b;max-width:100%}button{cursor:pointer}button:hover{background:#e6f1eb}button:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #a56816;outline-offset:3px}.card{background:#fff;border:1px solid #d1ded7;border-radius:12px;margin:20px 0;padding:24px;break-inside:avoid;overflow-wrap:anywhere}.eyebrow{font-size:.85rem;color:#14563e;font-weight:bold}.prompt{font-size:1.1rem}.draw-note,.source{font-size:.9rem;color:#45564d}summary{cursor:pointer;font-weight:bold;padding:8px 0}details{border-top:1px solid #d1ded7;margin-top:14px}section{margin-top:16px}li{margin:.45em 0}.feedback{border-left:3px solid #14563e;padding-left:12px}article[hidden]{display:none}footer{font-size:.9rem;margin:24px 0}@media(max-width:500px){main{padding:14px}.card{padding:16px}h1{font-size:1.6rem}}@media print{.toolbar,.source,footer{display:none}body{background:white}main{max-width:none;padding:0}.card{border-color:#aaa}details.answer:not([open]){display:none}.draw-note{color:#333}}
</style></head><body><main>
<header><p class="eyebrow">Teacher review draft · 24 October 2026</p><h1>Organic mechanism practice</h1>
<p>Four combined mechanisms and 16 focused questions, based on 16 marking groups in four OCR Chemistry A questions.</p>
<div class="notice"><strong>Original drawing practice, with teacher/self marking.</strong> This preview does not collect answers or calculate scores. It is separate from the revision tool’s question bank. Review the chemistry and marking before classroom use.</div>
<p>${escape(pack.assessment)}</p></header>
<div class="toolbar"><label for="mode">Questions:</label><select id="mode"><option value="all">All 20 questions</option><option value="combined">4 combined questions</option><option value="focused">16 focused questions</option></select>
<button id="show" type="button">Show all answers</button><button id="hide" type="button">Hide all answers</button><button id="print" type="button">Print visible questions</button></div>
<p id="count" role="status">Showing 20 questions.</p>${cards}
<footer>No network requests, accounts, analytics or browser storage. Changing filters preserves which guidance you have opened. Hide answers before printing a student sheet.</footer>
</main><script>
'use strict';
const cards=Array.from(document.querySelectorAll('article.card'));
document.getElementById('mode').addEventListener('change',event=>{let count=0;for(const card of cards){card.hidden=event.target.value!=='all'&&card.dataset.mode!==event.target.value;if(!card.hidden)count++;}document.getElementById('count').textContent='Showing '+count+' questions.';});
for(const [id,open] of [['show',true],['hide',false]])document.getElementById(id).addEventListener('click',()=>{for(const answer of document.querySelectorAll('details.answer'))answer.open=open;});
document.getElementById('print').addEventListener('click',()=>window.print());
</script></body></html>\n`;
const outputs = new Map([
  ['docs/MECHANISM_MARKPOINT_PACK.md', md.join('\n')],
  ['content-drafts/ocr-mechanism-review.html', html.replace(/[\t ]+$/gm, '')]
]);
for (const [filename, contents] of outputs) {
  const absolute = path.join(root, filename);
  if (process.argv.includes('--check')) {
    assert.equal(fs.readFileSync(absolute, 'utf8'), contents, `${filename} is stale; run node scripts/build-mechanism-review.cjs`);
  } else fs.writeFileSync(absolute, contents);
}
console.log(`Validated ${questions.length} questions: 4 combined, 16 focused; all 16 source groups mapped once in each format.${process.argv.includes('--check') ? ' Generated files are current.' : ''}`);
