'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const F=require('../src/flashcards.cjs');
function buildFlashcards(){
 const topics=JSON.parse(read('flashcards/topics.json'));
 const parsed=F.parseCSV(read('docs/flashcards/organic-names-and-formulae.csv'),topics.chemistry);
 if(parsed.errors.length)throw Error(parsed.errors.join('\n'));
 const sample={subject_id:'chemistry',topic_id:'basic',title:'Organic names and formulae',cards:parsed.cards.map(c=>({card_id:c.id,topic_id:c.topic,front:c.front,back:c.back,content_version:1,pack_id:'11111111-2222-4333-8444-555555555555'}))};
 fs.writeFileSync(path.join(root,'flashcards/sample-pack.json'),JSON.stringify(sample,null,2)+'\n');
 esbuild.buildSync({absWorkingDir:root,entryPoints:['src/flashcard-app.cjs'],outfile:'flashcard-app.js',bundle:true,platform:'browser',target:['es2022'],minify:true,supported:{'template-literal':false},legalComments:'eof'});
 buildFlashcardPreview();
}
function buildFlashcardPreview(output=path.join(root,'flashcards-preview.html')){
 const script='window.LABRATS_FLASHCARD_DEMO='+read('flashcards/sample-pack.json').replace(/</g,'\\u003c')+';\n'+read('flashcard-app.js');
 const css=require('./font-css.cjs')()+'\n'+['styles.css','student-login.css','design.css','flashcards.css'].map(read).join('\n');
 const hash=text=>createHash('sha256').update(text).digest('base64');
 const policy=`default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(css)}'; style-src-attr 'unsafe-inline'; font-src data:; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
 if(/<\/script/i.test(script)||/<\/style/i.test(css))throw Error('Unsafe inline preview asset.');
 const html=read('flashcards.html').replace(/<link rel="stylesheet"[^>]*>/g,'').replace('</head>',()=>`<meta http-equiv="Content-Security-Policy" content="${policy}"><style>${css}</style></head>`).replace(/<script src="flashcard-app\.js(?:\?v=[^"]*)?" defer><\/script>/,()=>`<script>${script}</script>`);
 fs.writeFileSync(output,'<!-- Generated guest-only sample preview: no hosted connection. -->\n'+html);
}
if(require.main===module)buildFlashcards();
module.exports={buildFlashcards,buildFlashcardPreview};
