'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const {buildStaffPreview}=require('./build-staff.cjs');
function buildStaffDemo(output=path.resolve('staff-showcase-preview.html')){
 const result=esbuild.buildSync({entryPoints:['src/staff-demo.cjs'],bundle:true,write:false,platform:'browser',target:['es2022'],minify:true,supported:{'template-literal':false},legalComments:'eof'});
 buildStaffPreview({supabaseUrl:'https://preview.invalid',publishableKey:'sb_publishable_fictional_preview'},output,{bundle:result.outputFiles[0].text,demo:true});
 return output;
}
if(require.main===module)console.log(buildStaffDemo(process.argv[2]));
module.exports={buildStaffDemo};
