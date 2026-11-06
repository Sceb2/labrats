'use strict';
// Share Auth storage, including the memory fallback, across sign-in and practice.
require('./student-login.cjs');
require('./progress-sync.cjs');
const originalOpen = window.RevisionSync.open;
window.RevisionSync.open = (bank, onRecords) => originalOpen(bank, onRecords, {
  navigate: () => location.reload(), loginUrl: location.href
});
let started = false;
function practice(event) {
  event?.preventDefault();
  if (started) return;
  started = true;
  const address=new URL(location.href);
  if(event?.currentTarget?.matches('#preview-login header a'))address.searchParams.set('guest','1');
  else address.searchParams.delete('guest');
  history.replaceState(null,'',address.href);
  document.getElementById('preview-login').hidden = true;
  document.getElementById('preview-practice').hidden = false;
  document.body.className = 'student-app';
  for (const source of window.OCR_SITE_PREVIEW.scripts) {
    const script = document.createElement('script');
    script.textContent = source;
    document.body.append(script);
  }
}
document.getElementById('continue-practice').addEventListener('click', practice);
document.querySelector('#preview-login header a').addEventListener('click', practice);
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !started || link.closest('#preview-login')) return;
  const href = link.getAttribute('href');
  if (href?.startsWith('student-login.html') || href === 'index.html') {
    event.preventDefault();
    // A fresh page owns the next account. The real beforeunload handler warns
    // about any pending attempts before navigation.
    location.reload();
  }
});
