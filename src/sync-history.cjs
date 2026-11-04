'use strict';
const {mergeEvents}=require('./learning-events.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const PAGE_SIZE=500;

function cachedCursor(cache){
  const c=cache?.pullCursor;
  return Array.isArray(cache?.history)&&cache.history.length&&c?.version===1&&
    TIMESTAMP.test(c.received_at)&&UUID.test(c.event_id)?c:null;
}

// Receipt timestamps retain PostgreSQL's microseconds. Do not round through Date.
// Migration 014 makes receipts increase in commit order within each channel.
async function pullHistory({client,table,student,subject,history,cursor,closed,commit}){
  while(!closed()){
    let query=client.from(table).select('*').eq('student_id',student).eq('subject_id',subject);
    if(cursor)query=query.or(`received_at.gt.${cursor.received_at},and(received_at.eq.${cursor.received_at},event_id.gt.${cursor.event_id})`);
    const result=await query.order('received_at').order('event_id').limit(PAGE_SIZE);
    if(closed())return;
    if(result.error)throw result.error;
    if(!Array.isArray(result.data))throw Error('Invalid history response.');
    if(!result.data.length)return;
    const last=result.data.at(-1);
    const next={version:1,received_at:last.received_at,event_id:last.event_id};
    if(!TIMESTAMP.test(next.received_at)||!UUID.test(next.event_id)||
      cursor&&next.received_at===cursor.received_at&&next.event_id===cursor.event_id)throw Error('Invalid history checkpoint.');
    const merged=mergeEvents(history,result.data);
    // Store a complete page and its checkpoint atomically, before asking for more.
    commit(merged,next);
    history=merged;cursor=next;
    if(result.data.length<PAGE_SIZE)return;
  }
}
module.exports={cachedCursor,pullHistory};
