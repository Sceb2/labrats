'use strict';
function health(policy,last,now=Date.now()){
 if(!policy?.retention_enabled)return {ok:false,reason:'disabled'};
 if(!last)return {ok:false,reason:'missing_run'};
 if(!last.finished_at||!Number.isFinite(Date.parse(last.finished_at))||now-Date.parse(last.finished_at)>8*86400000)return {ok:false,reason:'overdue_run'};
 if(last.status!=='success'||last.failures>0)return {ok:false,reason:'failed_run'};
 return {ok:true,reason:'healthy'};
}
function dashboardHealth(state,now=Date.now()){
 const result=health({retention_enabled:state.enabled},state.last_run,now);
 const messages={
  disabled:['Policy not enabled','Finish the account review and check the weekly schedule before enabling deletion.'],
  missing_run:['Weekly cleanup has no recorded run','Check the Supabase weekly schedule and its run history.'],
  overdue_run:['Weekly cleanup needs checking','The latest run has not completed, or completed more than eight days ago. Check Supabase Cron.'],
  failed_run:['Cleanup failed — action needed','Check recent cleanup runs, investigate the failure and arrange a retry.'],
  healthy:['Weekly cleanup is up to date','Check here regularly for failed or missing runs.']
 };
 const [title,message]=messages[result.reason];
 return {...result,title,message,attention:state.enabled&&!result.ok};
}
module.exports={health,dashboardHealth};
