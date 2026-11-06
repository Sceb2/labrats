'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
test('approved privacy notice is readable without sign-in, preserves guest navigation and is embedded in downloads',async()=>{
 const root=path.resolve(__dirname,'..');
 const site=http.createServer(async(req,res)=>{
  try{
   const file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html');
   if(!file.startsWith(root+path.sep))throw Error('Outside site');
   res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
   res.end(await fs.readFile(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>site.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+site.address().port+'/';let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  for(const width of [320,390,1280]){
   const page=await browser.newPage({viewport:{width,height:900}}),external=[],errors=[];
   await page.route('**/*',route=>{if(route.request().url().startsWith(base))return route.continue();external.push(route.request().url());return route.abort();});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'index.html?guest=1');await page.waitForFunction(()=>document.querySelector('.privacy-link').search==='?guest=1');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('.privacy-link').click();await page.waitForSelector('article h1');
   assert.equal(new URL(page.url()).searchParams.get('guest'),'1');
   assert.match(await page.locator('article').innerText(),/two years after first successful login/);
   assert.match(await page.locator('article').innerText(),/Mr Wormstone in person/);
   assert.doesNotMatch(await page.locator('article').innerText(),/Draft|School publication check/);
   assert.equal(await page.locator('a[href="mailto:sceb2@crispins.co.uk"]').count(),1);
   await page.waitForFunction(()=>document.querySelector('.privacy-return').search==='?guest=1');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width===390)await page.screenshot({path:'/tmp/labrats-approved-privacy-mobile.png',fullPage:true});
   await page.locator('.privacy-return').click();await page.waitForSelector('.subject-card');assert.equal(new URL(page.url()).searchParams.get('guest'),'1');
   await page.goto(base+'subject-hub-preview.html?guest=1');await page.locator('.privacy-link').click();
   await page.waitForSelector('#privacy-notice:visible');assert.match(await page.locator('#privacy-notice').innerText(),/Mr Wormstone in person/);
   assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await page.close();
  }
  // Login previews must not depend on a neighbouring privacy.html file.
  for(const file of ['student-login-pilot.html','student-progress-pilot.html','student-site-preview.html','applied-science-preview.html']){
   const html=await fs.readFile(path.join(root,file),'utf8');assert(html.includes('id="privacy-notice"'),file);assert(!html.includes('href="privacy.html"'),file);
  }
 }finally{await browser?.close();await new Promise(r=>site.close(r));}
});
