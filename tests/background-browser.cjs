'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
test('staff reuses verified identity, pauses hidden refreshes and rechecks permissions on return',async()=>{
 const script=esbuild.buildSync({absWorkingDir:root,stdin:{resolveDir:root,contents:`
 const f=window.staffFixture={checks:0,rows:0,active:true};
 const profile={user_id:'fictional-teacher',role:'teacher',active:true,must_change_password:false};
 const tables={school_classes:[],class_students:[],account_profiles:[],staff_subjects:[{teacher_id:profile.user_id,subject_id:'chemistry'}]};
 const client={auth:{getUser(){throw Error('Duplicate Auth lookup');},async getSession(){return {data:{session:{}}};}},
  from(table){const q={select(){return q;},eq(){return q;},order(){return q;},range(){return q;},then(resolve){f.rows++;return Promise.resolve({data:tables[table]||[],error:null}).then(resolve);}};return q;},
  async rpc(){return {data:{},error:null};}};
 const connection={client,async profile({withUser=false}={}){f.checks++;if(!withUser)throw Error('Verified identity was not requested');return {profile:{...profile,active:f.active},user:{email:'fictional@example.invalid'}};},async signOut(){}};
 require('./src/staff-app.cjs').start(async()=>connection);
 `},bundle:true,write:false,platform:'browser'}).outputFiles[0].contents;
 const server=http.createServer(async(req,res)=>{try{
  const rel=new URL(req.url,'http://local').pathname.slice(1)||'staff.html',file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||rel.startsWith('.'))throw Error('Invalid path');
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
  res.end(rel==='staff.js'?script:await fs.readFile(file));
 }catch{res.writeHead(404);res.end();}});
 let browser;
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage();await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.addInitScript(()=>{window.staffHidden=false;Object.defineProperty(document,'hidden',{get:()=>window.staffHidden});window.setInterval=fn=>{window.staffTick=fn;return 1;};});
  await page.goto(base+'staff.html');await page.waitForFunction(()=>document.querySelector('#staff-status').textContent.startsWith('Staff tools ready'));
  assert.match(await page.locator('#staff-identity').innerText(),/fictional@example.invalid/);
  const initial=await page.evaluate(()=>[staffFixture.checks,staffFixture.rows]);assert.deepEqual(initial,[1,4]);
  await page.evaluate(async()=>{staffHidden=true;for(let i=0;i<4;i++)await staffTick();});
  assert.deepEqual(await page.evaluate(()=>[staffFixture.checks,staffFixture.rows]),initial);
  await page.evaluate(()=>{staffHidden=false;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
  await page.waitForFunction(()=>staffFixture.rows===8);assert.equal(await page.evaluate(()=>staffFixture.checks),2);
  await page.evaluate(()=>staffTick());assert.deepEqual(await page.evaluate(()=>[staffFixture.checks,staffFixture.rows]),[3,12]);
  await page.evaluate(()=>{staffHidden=true;document.dispatchEvent(new Event('visibilitychange'));staffFixture.active=false;staffHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForSelector('#staff-login:not([hidden])');assert.equal(await page.locator('#staff-account').isVisible(),false);
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
