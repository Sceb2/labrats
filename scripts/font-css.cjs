const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
module.exports=()=>fs.readFileSync(path.join(root,'fonts.css'),'utf8').replace(/url\("(assets\/fonts\/[a-zA-Z0-9_-]+\.ttf)"\)/g,(_,file)=>'url("data:font/ttf;base64,'+fs.readFileSync(path.join(root,file)).toString('base64')+'")');
