'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Feedback=require('../feedback.js');
test('reveals, retries and self-assessments retain distinct visible meaning',()=>{
 const reveal=Feedback.header({score:0,max:4,revealed:true});assert.match(reveal,/Answer revealed/);assert.match(reveal,/Not scored/);assert(!reveal.includes('0 of 4'));
 assert.match(Feedback.header({score:2,max:4,retry:true}),/2 of 4 on retry/);
 assert.match(Feedback.header({score:2,max:4,self:true,retry:true}),/2 of 4 self-assessed marks on retry/);
 assert.match(Feedback.attemptNote({retry:true,first:{score:1,max:4}}),/First attempt: 1 of 4/);
 assert.match(Feedback.attemptNote({assisted:true}),/does not improve your unaided revision rating/);
 assert.equal(Feedback.attemptNote({}), '');
});
test('display helpers escape untrusted labels and keep optional points separate from earned marks',()=>{
 const markup=Feedback.point({title:'<script>wrong</script>',score:0,max:1,body:'<p>Trusted rendered explanation</p>'});
 assert(!markup.includes('<script>'));assert(markup.includes('&lt;script&gt;'));assert(markup.includes('<p>Trusted rendered explanation</p>'));
 assert.match(Feedback.point({title:'Optional condition',optional:true}),/Optional · no mark required/);
 assert(!Feedback.attemptNote({retry:true,first:{score:NaN,max:2}}).includes('NaN'));
});
