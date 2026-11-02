'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:900});
   for(const file of ['applied-science.html','applied-science-preview.html','forces-draft.html','electricity-draft.html']){
    await page.goto(base+'/'+file);
    const waves=file.startsWith('applied-science');
    if(file==='applied-science-preview.html'){await page.waitForSelector('#login-form:not([hidden])');await page.locator('#preview-login header a').click();}
    if(waves){await page.waitForSelector('#app .setup-page, #app .question-screen');await page.evaluate(()=>window.AppliedPrototype.openQuestion('W07','practice'));}
    else{await page.waitForSelector('[data-open]',{state:'attached'});await page.evaluate(()=>{const qs=JSON.parse(document.querySelector('#forces-bank').textContent).topics.flatMap(t=>t.questions),i=qs.findIndex(q=>q.parts.some(p=>p.type==='numeric'));document.querySelector('[data-open="'+i+'"]').click();});}
    const input=page.locator('[data-number]').first();await input.fill('12.5');
    const stateBefore=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));
    const hint=page.locator(waves?'#hint-panel':'#hint');assert.equal(await hint.evaluate(el=>el.open),false);
    assert.equal(await page.locator('.question-total').count(),0);
    assert.doesNotMatch(await page.locator('.question-screen').textContent(),/Automatically marked/);
    const button=page.locator('.eq-open');assert.equal(await button.count(),1);await button.click();
    const dialog=page.locator('.eq-dialog');assert(await dialog.isVisible());assert.equal(await dialog.locator('.eq-row').count(),20);
    assert.match(await dialog.textContent(),/Wave speed/);assert.match(await dialog.textContent(),/Specific latent heat/);
    assert.equal(await dialog.locator('msqrt').count(),1);
    await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('.eq-dialog')));
    const headerY=(await dialog.locator('.eq-head').boundingBox()).y;
    await dialog.locator('.eq-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
    assert.equal((await dialog.locator('.eq-head').boundingBox()).y,headerY);
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false);
    const box=await dialog.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
    await dialog.locator('.eq-close').click();await page.waitForFunction(()=>document.body.style.overflow!=='hidden');assert.equal(await input.inputValue(),'12.5');assert(await button.evaluate(el=>el===document.activeElement));
    assert.equal(await hint.evaluate(el=>el.open),false);assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage})),stateBefore);
    await button.click();assert.equal(await dialog.locator('.eq-scroll').evaluate(el=>el.scrollTop),0);await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);await page.waitForFunction(()=>document.body.style.overflow!=='hidden');
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
    assert.equal(await page.locator('.eq-dialog').count(),1);
    await page.reload();
   }
  }
  assert.deepEqual(errors,[]);console.log('Passed: equation sheet in main practice and all standalone previews at 320/390/1280px; complete sheet, keyboard, scrolling, retained answers, unchanged progress/hints, and removed repeated totals.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
