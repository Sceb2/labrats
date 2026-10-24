'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const {appliedLearningBank}=require('../src/subjects.cjs');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const bank=appliedLearningBank(read('applied-science/Pilot_Question_Bank.json'),read('applied-science/Physics_Lesson_Map.json'));
fs.writeFileSync(path.join(root,'applied-science/learning-bank.json'),JSON.stringify(bank,null,2)+'\n');
esbuild.buildSync({absWorkingDir:root,entryPoints:['applied-science/app.js'],outfile:'applied-app.js',bundle:true,format:'iife',platform:'browser',target:['es2022'],minify:true,supported:{'template-literal':false},legalComments:'eof'});
