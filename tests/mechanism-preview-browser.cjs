'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),bank=require('../questions.json');
const map=require('../content-drafts/mechanism-card-map.json');

test('all 20 cards render and score through actual UI; preview isolates storage and never contacts Supabase',async()=>{
  let browser,server;
  try{
    const html=fs.readFileSync(path.join(root,'mechanism-cards-preview.html'));
    server=http.createServer((req,res)=>{if(req.url==='/preview.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);}else{res.writeHead(404);res.end();}});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const address=`http://127.0.0.1:${server.address().port}/preview.html`;
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
    const errors=[],violations=[],requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(/Content Security Policy|Refused to/.test(message.text()))violations.push(message.text());});
    page.on('request',request=>{if(!request.url().startsWith('data:'))requests.push(request.url());});
    await page.addInitScript(()=>{window.nativePreviewStorage=window.localStorage;window.localStorage.setItem('ocrOrgProgressV2','saved-guest-progress');});
    await page.goto(address);
    await page.waitForFunction(()=>document.getElementById('preview-card-status').textContent.startsWith('MC25'));
    const [enlarged]=await Promise.all([context.waitForEvent('page'),page.locator('.diagram-zoom').first().click()]);
    await enlarged.waitForSelector('svg');await enlarged.close();
    assert.equal(await page.locator('#task input:checked').count(),0);
    const registry=require('../assets.json');
    const drawings=Object.entries(registry).filter(([id])=>id.startsWith('mp-')).map(([,asset])=>fs.readFileSync(path.join(root,asset.path),'utf8'));
    const clipped=await page.evaluate(drawings=>{
      const box=document.createElement('div');box.style='position:absolute;left:-10000px;top:0';box.innerHTML=drawings.join('');document.body.append(box);
      const clipped=Array.from(box.querySelectorAll('svg')).map(svg=>({title:svg.querySelector('title').textContent,bounds:svg.querySelector('g').getBBox()})).filter(({bounds:b})=>b.x<0||b.y<0||b.x+b.width>600||b.y+b.height>350).map(value=>value.title);
      box.remove();return clipped;
    },drawings);
    assert.deepEqual(clipped,[],'Diagram content must fit inside its viewBox.');
    const choose=async(q,wrongFirst=false)=>{
      await page.selectOption('#card-select',q.id);
      for(const [i,c]of q.components.entries()){
        const accepted=q.validMethods[0].answers[c.id];
        const option=wrongFirst&&i===0?c.options.find(id=>!accepted.includes(id)):accepted[0];
        const radio=page.locator(`input[data-component="${c.id}"][value="${option}"]`);
        if(await radio.count())await radio.check();else await page.locator(`select[data-component="${c.id}"]`).selectOption(option);
      }
    };
    for(const id of map.questions){
      const q=bank.questions.find(q=>q.id===id);
      await choose(q);
      assert.equal(await page.locator('#task [data-component]').count(),q.components.reduce((sum,c)=>sum+(bank.vocabulary[c.options[0]].asset?4:1),0));
      assert.equal(await page.locator('.model-answer').count(),0);
      await page.locator('#submit').click();
      assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),`${q.maxMark} of ${q.maxMark} marks`);
    }
    // Clear only the in-memory preview records before checking first-attempt semantics.
    await page.locator('#preview-reset').click();
    const combined=bank.questions.find(q=>q.id==='MC25');
    await choose(combined,true);await page.locator('#submit').click();
    assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),'4 of 5 marks');
    await page.locator('#retry').click();
    const c=combined.components[0],right=combined.validMethods[0].answers[c.id][0];
    await page.locator(`input[data-component="${c.id}"][value="${right}"]`).check();
    await page.locator('#submit').click();
    assert.equal(await page.evaluate(()=>S.progress.records.MC25.first.score),4);
    await page.selectOption('#card-select','MC28');await page.locator('#preview-reveal').click();
    assert.equal(await page.locator('.model-answer').count(),1);
    assert.equal(await page.evaluate(()=>S.progress.records.MC28.first),null);
    await page.selectOption('#card-select','MC37');
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('#task img')).every(img=>img.complete&&img.naturalWidth>0));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    assert.equal(await page.locator('#task input[type=radio]').count(),4);
    await page.screenshot({path:'/tmp/ocr-mechanism-card-mobile.png',fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await page.screenshot({path:'/tmp/ocr-mechanism-card-desktop.png',fullPage:true});
    assert.equal(await page.evaluate(()=>window.nativePreviewStorage.getItem('ocrOrgProgressV2')),'saved-guest-progress');
    await page.reload();await page.waitForFunction(()=>document.getElementById('preview-card-status').textContent.startsWith('MC25'));
    assert.deepEqual(await page.evaluate(()=>Object.keys(S.progress.records)),[]);
    assert(requests.every(url=>url===address),requests.join('\n'));
    assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
  }finally{
    if(browser)await browser.close();
    if(server)await new Promise(resolve=>server.close(resolve));
  }
});
