#!/usr/bin/env node
'use strict';
const {monitor}=require('../src/retention-monitor.cjs');
(async()=>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Retention monitoring credentials are not configured.');
 const result=await monitor({url,key,webhook:process.env.RETENTION_ALERT_WEBHOOK_URL});
 console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
})().catch(()=>{console.error('Retention monitoring failed. Check the school alert and Supabase configuration.');process.exitCode=1});
