#!/usr/bin/env node
/* apply_playable_filter.js - inline drop-unresolved-embeds filter into MIXED providers */
const fs=require('fs');const path=require('path');
const PD=path.join(__dirname,'..','providers'),BD=path.join(__dirname,'.playable_backup');
fs.mkdirSync(BD,{recursive:true});
const TARGETS=['homecine.js','verpelis.js','tioanime.js','henaojara.js','megadedeoficial.js'];
const FILTER=['/* __PLAYABLE_FILTER__ */','var __filterPlayable = (function () {','  return function (sources) {','    var arr = sources || [];','    var out = [];','    for (var i = 0; i < arr.length; i++) {','      var s = arr[i];','      if (s && s.isEmbed) continue;','      if (s) out.push(s);','    }','    return out;','  };','})();'].join('\n');
const WRAP=['','(function () {','  var _og = module.exports.getStreams;','  if (typeof _og === "function" && !_og.__PLAYABLE_WRAPPED__) {','    var _w = function () { var r = _og.apply(null, arguments); return Promise.resolve(r).then(function (s) { return __filterPlayable(s || []); }); };','    _w.__PLAYABLE_WRAPPED__ = true;','    module.exports.getStreams = _w;','  }','})();'].join('\n');
function pf(f){const fp=path.join(PD,f);if(!fs.existsSync(fp)){console.log('SKIP(missing) '+f);return;}let c=fs.readFileSync(fp,'utf8');if(c.includes('__PLAYABLE_FILTER__')){console.log('SKIP(already) '+f);return;}if(!/module\.exports\s*=\s*\{\s*getStreams\s*\};/.test(c)){console.log('SKIP(shape) '+f);return;}const bak=path.join(BD,f);if(!fs.existsSync(bak))fs.writeFileSync(bak,c);const n=c.replace(/module\.exports\s*=\s*\{\s*getStreams\s*\};/,FILTER+'\nmodule.exports = { getStreams };'+WRAP);fs.writeFileSync(fp,n);console.log('OK '+f);}
const args=process.argv.slice(2);(args.length?args:TARGETS).forEach((t)=>pf(t.endsWith('.js')?t:t+'.js'));
console.log('Done.');