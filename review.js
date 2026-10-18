/* Outstanding review state is independent of immutable first-attempt marks. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ChemReview=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 function state(record){return record?.review?.schema===1?record.review:null}
 function migrate(progress){
  let imported=0;
  for(const record of Object.values(progress.records||{})){
   if(!record||typeof record!=='object'||state(record))continue;
   // v1.7 has no timestamp for a successful retry. Import old errors conservatively;
   // the historical correctAfterRetry flag cannot establish which result came last.
   const outstanding=['partial','incorrect'].includes(record.first?.outcome)||!!record.lastMistakeAt;
   record.review={schema:1,outstanding,lastIncorrectAt:record.lastMistakeAt||0,reviewedAt:null,reviewCount:0,imported:outstanding};
   if(outstanding)imported++;
  }
  progress.reviewSchema=1;return imported;
 }
 function apply(record,event,result,now=Date.now()){
  if(event!=='submit'||!result||!Number.isFinite(result.score)||!Number.isFinite(result.max)||result.max<=0)return record;
  const previous=state(record)||{schema:1,outstanding:false,lastIncorrectAt:0,reviewedAt:null,reviewCount:0};
  const full=result.score===result.max,review={...previous,lastScore:result.score,lastMax:result.max};
  if(!full){review.outstanding=true;review.lastIncorrectAt=now;record.lastMistakeAt=now}
  else if(previous.outstanding){review.outstanding=false;review.reviewedAt=now;review.reviewCount=(previous.reviewCount||0)+1;review.imported=false}
  record.review=review;return record;
 }
 function outstanding(bank,progress){return bank.questions.filter(q=>q.enabled!==false&&state(progress.records[q.id])?.outstanding).sort((a,b)=>(state(progress.records[b.id]).lastIncorrectAt||0)-(state(progress.records[a.id]).lastIncorrectAt||0)||a.id.localeCompare(b.id,undefined,{numeric:true}))}
 return {state,migrate,apply,outstanding};
});
