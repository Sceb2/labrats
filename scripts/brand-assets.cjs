const fs=require('node:fs'),path=require('node:path');
module.exports=html=>html.replace(/src="(assets\/brand\/(?:horizontal|stacked)\.svg)"/g,(_,file)=>'src="data:image/svg+xml;base64,'+fs.readFileSync(path.resolve(__dirname,'..',file)).toString('base64')+'"');
