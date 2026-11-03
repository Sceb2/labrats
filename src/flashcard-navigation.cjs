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
 flash.href=address.href;
 // Keep an empty selection on the topic page rather than opening an empty pack screen.
 flash.onclick=event=>{if(topics.length)return;event.preventDefault();document.querySelector('#app [data-topic],#app [data-lesson]')?.focus();};
 flash.title=topics.length?'Flashcards for your selected topics':'Choose a topic below first';
 const label=document.createElement('span');label.className='mode-label';label.textContent='Select your mode';
 nav.append(label,active,flash);const heading=document.querySelector('#app .setup-heading');if(heading)heading.after(nav);else host.before(nav);observeDock(host);
}
let dockObserver;
function measureDock(){
 const host=document.querySelector('#app .setup-actions');
 const nav=document.querySelector('.side-nav');
 document.documentElement.style.setProperty('--setup-dock-height',(host?.getBoundingClientRect().height||0)+'px');
 document.documentElement.style.setProperty('--setup-nav-height',(nav?.getBoundingClientRect().height||0)+'px');
 const active=document.activeElement,typing=active?.matches('textarea,input:not([type=checkbox]):not([type=radio]),select');
 document.body.classList.toggle('setup-keyboard-open',!!(typing&&window.visualViewport&&window.visualViewport.height<window.innerHeight-120));
}
function observeDock(host){
 dockObserver?.disconnect();
 if(window.ResizeObserver){dockObserver=new ResizeObserver(measureDock);dockObserver.observe(host);const nav=document.querySelector('.side-nav');if(nav)dockObserver.observe(nav);}
 measureDock();
}
window.addEventListener('resize',measureDock);
window.visualViewport?.addEventListener('resize',measureDock);
document.addEventListener('focusin',measureDock);document.addEventListener('focusout',()=>setTimeout(measureDock,0));
window.RevisionFlashcards={mount};
