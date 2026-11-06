'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function fixture(run){
 const release=JSON.parse(await fs.readFile(path.join(root,'version.json'),'utf8')).id;
 let unblock;const gate=new Promise(resolve=>{unblock=resolve;});
 const state={hold:false,corrupt:0,release,requests:[]};
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://local'),rel=decodeURIComponent(url.pathname).slice(1)||'index.html',file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||rel.startsWith('.'))throw Error('Unsafe path');
  state.requests.push({file:rel,version:url.searchParams.get('v')});
  if(state.hold&&rel.startsWith('applied-science/assets/'))await gate;
  if(state.failDiagrams&&rel.startsWith('applied-science/assets/')){res.writeHead(503,{'Cache-Control':'no-store'});res.end();return;}
  if(state.failBankOnce&&rel.endsWith('Pilot_Question_Bank.json')){state.failBankOnce=false;res.writeHead(503,{'Cache-Control':'public, max-age=3600'});res.end();return;}
  let body=await fs.readFile(file);
  if(rel.endsWith('.html'))body=Buffer.from(body.toString().replaceAll(release,state.release));
  if(rel==='version.json')body=Buffer.from(JSON.stringify({...JSON.parse(body),id:state.release}));
  if(rel==='report-config.json')body=Buffer.from(JSON.stringify({email:'review@example.invalid'}));
  if(rel.endsWith('Pilot_Question_Bank.json')&&state.corrupt){state.corrupt--;body=Buffer.concat([body,Buffer.from(' ')]);}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control',rel.endsWith('.html')||['version.json','report-config.json'].includes(rel)?'no-store':'public, max-age=3600');res.end(body);
 }catch{res.writeHead(404);res.end();}});
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext(),page=await context.newPage(),base='http://127.0.0.1:'+server.address().port+'/';
  // CDP blocking keeps real HTTP caching enabled; request interception disables it.
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setBlockedURLs',{urls:['https://*']});
  await run({page,context,base,state,unblock,count:file=>state.requests.filter(r=>r.file===file).length});
 }finally{unblock();await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
test('topics render before diagrams; current-release content is reused and selected diagrams work offline',()=>fixture(async({page,context,base,state,unblock,count})=>{
 state.hold=true;await page.goto(base+'applied-science.html?guest=1');await page.waitForSelector('.setup-page');
 await page.evaluate(()=>window.APPLIED_READY);
 assert(state.requests.filter(r=>r.file.startsWith('applied-science/assets/')).length<=4);
 const open=page.evaluate(()=>window.AppliedPrototype.openQuestion('E029'));
 await page.waitForSelector('#app-dialog[open]');assert.match(await page.locator('#dialog-heading').innerText(),/Loading diagrams/);
 unblock();await open;await page.waitForSelector('.wave-figure img');await page.locator('.wave-figure img').evaluate(img=>img.decode());
 await page.waitForFunction(()=>Object.keys(window.AppliedPrototype.state.assetCache).length===56);
 await page.locator('#report-question').click();assert.match(await page.locator('#report-recipient').innerText(),/review@example.invalid/);
 assert.equal(count('applied-science/report-config.json'),0);assert.equal(count('report-config.json'),1);
 const before=state.requests.filter(r=>r.file.startsWith('applied-science/assets/')||r.file.endsWith('Pilot_Question_Bank.json')||r.file.endsWith('Physics_Lesson_Map.json')).length;
 await page.reload();await page.waitForSelector('.setup-page,.question-screen');
 await page.waitForFunction(()=>Object.keys(window.AppliedPrototype.state.assetCache).length===56);
 const after=state.requests.filter(r=>r.file.startsWith('applied-science/assets/')||r.file.endsWith('Pilot_Question_Bank.json')||r.file.endsWith('Physics_Lesson_Map.json')).length;
 assert.equal(after,before,'warm page must not download the same banks/diagrams again');
 await context.setOffline(true);await page.evaluate(()=>window.AppliedPrototype.openQuestion('E111'));
 await page.locator('.wave-figure img').evaluate(img=>img.decode());assert(await page.locator('.wave-figure img').evaluate(img=>img.naturalWidth>0));
 await context.setOffline(false);state.release='r-loading-test';await page.reload();await page.waitForSelector('.setup-page,.question-screen');
 await page.waitForFunction(()=>Object.keys(window.AppliedPrototype.state.assetCache).length===56);
 assert.equal(count('applied-science/Pilot_Question_Bank.json'),2);
 assert(state.requests.some(r=>r.file.startsWith('applied-science/assets/')&&r.version===state.release));
}));
test('a corrupt cached bank is fetched freshly once; persistent mismatches still block practice',()=>fixture(async({page,base,state,count})=>{
 state.corrupt=1;await page.goto(base+'applied-science.html?guest=1');await page.waitForSelector('.setup-page');
 assert.equal(count('applied-science/Pilot_Question_Bank.json'),2);
 state.release='r-corrupt-test';state.corrupt=100;await page.reload();await page.waitForSelector('#release-notice');
 assert.equal(await page.locator('.setup-page').count(),0);assert.equal(count('applied-science/Pilot_Question_Bank.json'),4);
}));
test('Chemistry also reuses its verified bank files on a warm visit',()=>fixture(async({page,base,count})=>{
 await page.goto(base+'chemistry.html?guest=1');await page.waitForSelector('.setup-page');
 assert.equal(count('questions.json'),1);assert.equal(count('assets.json'),1);
 await page.reload();await page.waitForSelector('.setup-page');assert.equal(count('questions.json'),1);assert.equal(count('assets.json'),1);
}));

test('missing offline diagrams do not start a question; reconnect and retry recovers',()=>fixture(async({page,context,base,state})=>{
 state.failDiagrams=true;await page.goto(base+'applied-science.html?guest=1');await page.waitForSelector('.setup-page');
 await context.setOffline(true);await page.evaluate(()=>window.AppliedPrototype.openQuestion('E029'));
 await page.waitForSelector('#retry-diagrams');assert.equal(await page.evaluate(()=>window.AppliedPrototype.state.session),null);
 state.failDiagrams=false;await context.setOffline(false);await page.locator('#retry-diagrams').click();await page.waitForSelector('.wave-figure img');
 await page.locator('.wave-figure img').evaluate(img=>img.decode());assert(await page.locator('.wave-figure img').evaluate(img=>img.naturalWidth>0));
}));

test('cancelling preparation cannot replace a newly opened session',()=>fixture(async({page,base,state,unblock})=>{
 state.hold=true;await page.goto(base+'applied-science.html?guest=1');await page.waitForSelector('.setup-page');
 const pending=page.evaluate(()=>window.AppliedPrototype.openQuestion('E029'));await page.waitForSelector('#app-dialog[open]');
 await page.locator('#dialog-close').click();
 const chosen=await page.evaluate(async()=>{const tool=window.AppliedPrototype,q=tool.state.bank.questions.find(q=>!q.asset);await tool.openQuestion(q.id);return tool.state.session.id;});
 unblock();await pending;assert.equal(await page.evaluate(()=>window.AppliedPrototype.state.session.id),chosen);
}));

test('a cached HTTP failure is retried freshly rather than trapping subsequent loads',()=>fixture(async({page,base,state,count})=>{
 state.failBankOnce=true;await page.goto(base+'applied-science.html?guest=1');await page.waitForSelector('.setup-page');
 assert.equal(count('applied-science/Pilot_Question_Bank.json'),2);
}));
