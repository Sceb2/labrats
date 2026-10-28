'use strict';
const {metadata}=require('./learning-events.cjs');
const {rejectionReason}=require('./sync-rejections.cjs');
// One acknowledgement/rejection protocol for question and flashcard queues.
async function uploadBatch({client,rpc,owner,batch,closed,accepted,rejected}){
 if(closed()||!batch.length)return;
 const result=await client.rpc(rpc,{events:batch,expected_student:owner});if(closed())return;
 if(result.error){
  const reason=rejectionReason(result.error);if(!reason)throw result.error;
  if(batch.length>1){const middle=Math.floor(batch.length/2);await uploadBatch({client,rpc,owner,batch:batch.slice(0,middle),closed,accepted,rejected});await uploadBatch({client,rpc,owner,batch:batch.slice(middle),closed,accepted,rejected});}
  else rejected(metadata(batch[0]),reason);
  return;
 }
 if(!Array.isArray(result.data))throw Error('Incomplete acknowledgement.');
 const ids=new Set(result.data);if(batch.some(e=>!ids.has(e.event_id)))throw Error('Incomplete acknowledgement.');
 accepted(batch,ids);
}
module.exports={uploadBatch};
