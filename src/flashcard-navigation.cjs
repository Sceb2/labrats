'use strict';
function mount(subject,topics){
 const host=document.querySelector('#app .setup-actions');if(!host)return;
 document.querySelector('#app .study-modes')?.remove();
 const nav=document.createElement('nav');nav.className='study-modes';nav.setAttribute('aria-label','Learning mode');
 const active=document.createElement('span');active.className='btn';active.textContent='Active Learning';active.setAttribute('aria-current','page');
 const flash=document.createElement('a');flash.className='btn secondary';flash.textContent='Flashcards';
 const address=new URL(window.OCR_SITE_PREVIEW?'flashcards-preview.html':'flashcards.html',location.href);
 address.searchParams.set('subject',subject);address.searchParams.set('topics',topics.join(','));
 if(new URLSearchParams(location.search).get('guest')==='1')address.searchParams.set('guest','1');
 flash.href=address.href;nav.append(active,flash);host.before(nav);
}
window.RevisionFlashcards={mount};
