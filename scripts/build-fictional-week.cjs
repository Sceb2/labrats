'use strict';
const fs=require('node:fs');
const banks=[require('../questions.json'),require('../applied-science/learning-bank.json')];
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const rows=[];
for(const b of banks){const counts=new Map();for(const q of b.questions.filter(q=>q.enabled!==false)){
 const topic=q.prerequisites[0];if((counts.get(topic)||0)>=6)continue;counts.set(topic,(counts.get(topic)||0)+1);
 rows.push('('+[b.meta.subjectId||'chemistry',q.id,b.meta.bankVersion,b.meta.scoringVersion,q.maxMark,topic].map(quote).join(',')+')');
}}
const template=fs.readFileSync('supabase/operator/seed-fictional-week.template.sql','utf8');
fs.writeFileSync('supabase/operator/seed-fictional-week.sql',template.replace('-- QUESTION_ROWS',rows.join(',\n')+';'));
