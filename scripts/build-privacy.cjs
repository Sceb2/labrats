'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function noticeHTML(){
 return fs.readFileSync(path.join(root,'docs/STUDENT_PRIVACY_NOTICE.md'),'utf8').trim().split(/\n\s*\n/).map(paragraph=>{
  const heading=paragraph.startsWith('# '),text=escape(paragraph.replace(/^# /,'').replace(/\n/g,' '))
   .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
   .replace('sceb2@crispins.co.uk','<a href="mailto:sceb2@crispins.co.uk">sceb2@crispins.co.uk</a>')
   .replace('(ico.org.uk)','(<a href="https://ico.org.uk/">ico.org.uk</a>)');
  return heading?`<h1>${text}</h1>`:`<p>${text}</p>`;
 }).join('\n');
}
// Downloadable previews carry the same approved notice without needing a
// neighbouring privacy.html. Fragment navigation opens its enclosing details.
function inlinePrivacyNotice(html){
 if(!html.includes('href="privacy.html"'))return html;
 return html.replaceAll('href="privacy.html"','href="#privacy-notice"')
  .replace('</body>',()=>`<details class="card login-card"><summary>Privacy notice</summary><div id="privacy-notice">${noticeHTML().replace('<h1>','<h2>').replace('</h1>','</h2>')}</div></details></body>`);
}
function buildPrivacy(){
 const html=`<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'"><title>Your information · LabRats</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="student-login.css"><link rel="stylesheet" href="design.css"><link rel="stylesheet" href="fonts.css"></head>
<body class="login-page account-branded"><a class="skip" href="#main">Skip to content</a><div class="account-mobile-brand"><img src="assets/brand/horizontal.svg" width="190" height="69" alt="LabRats"></div><aside class="account-brand-sidebar" aria-label="LabRats"><img src="assets/brand/stacked.svg" width="128" height="123" alt="LabRats"></aside><div class="account-workspace"><header><nav><a class="privacy-return" href="index.html">Choose subject</a></nav></header><main id="main" class="login-main"><article class="card login-card">${noticeHTML()}<p class="small-note">Last updated: 6 November 2026</p></article></main></div><script src="subject-hub.js" defer></script></body></html>\n`;
 fs.writeFileSync(path.join(root,'privacy.html'),'<!-- Generated from docs/STUDENT_PRIVACY_NOTICE.md by npm run build. -->\n'+html);
}
if(require.main===module)buildPrivacy();
module.exports={buildPrivacy,noticeHTML,inlinePrivacyNotice};
