'use strict';
// LAB ONLY, intentionally RED. No real licenses, PINs, customers, or device storage.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../docs/mock-backend.js'),'utf8');
const from=src.indexOf('    cambiar(licencia, opts) {');
const to=src.indexOf('    /* CLAIM / MERGE',from);
assert.ok(from>=0&&to>from);
const method=src.slice(from,to);
const A='F123-SYNTHETIC-A',B='F123-SYNTHETIC-B';
function run(failureKey){
 const disk=new Map([
  ['f123_owned',JSON.stringify({licenseCode:B,instanceId:'synthetic-device'})],
  ['f123_tienda_activa',''],
  ['f123_tiendas',JSON.stringify({[A]:''})],
  ['f123_estado_v4_A',JSON.stringify({nombreNegocio:'Existing shop',productos:[{id:'item-a',stock:12}]})]
 ]);
 const sandbox=[
   'let reloads=0,room="";',
   'const localStorage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(k===failureKey)throw Object.assign(new Error("quota"),{name:"QuotaExceededError"});disk.set(k,String(v));}};',
   'const _normLic=x=>String(x||"").trim().toUpperCase().replace(/\\s+/g,"");',
   'const _licenciaPropia=()=>JSON.parse(localStorage.getItem("f123_owned")).licenseCode;',
   'const _licenciaActual=()=>A;',
   'const OC_STATE_SUFIJO="";',
   'const guardarEstadoLocal=()=>{};',
   'const window={OCSyncControl:{fijarSala:x=>{room=x;return {ok:true};}}};',
   'const location={reload:()=>{reloads++;}};',
   'const obj={'+method+'};',
   'const result=obj.cambiar(B,{desde:A});',
   'return {result,reloads,room,active:disk.get("f123_tienda_activa"),original:disk.get("f123_estado_v4_A"),registry:disk.get("f123_tiendas")};'
 ].join('\n');
 return new Function('disk','failureKey','A','B',sandbox)(disk,failureKey,A,B);
}
test('control: durable notebook switch may report success only after active marker commit',()=>{
 const x=run('__none__');
 assert.equal(x.result.ok,true);
 assert.equal(x.active,'::'+B);
 assert.equal(x.reloads,1);
});
test('P0 RED: quota on active marker MUST NOT report success or reload to wrong notebook',()=>{
 const x=run('f123_tienda_activa');
 assert.equal(x.result.ok,false,'destination was not durably selected');
 assert.equal(x.reloads,0,'do not reload into the wrong selected notebook');
 assert.equal(x.room,'','do not set sync room after failed notebook commit');
 assert.equal(x.active,'');
 assert.match(x.original,/Existing shop/);
});
test('P0 RED: quota on registry mapping MUST NOT acknowledge an untracked notebook switch',()=>{
 const x=run('f123_tiendas');
 assert.equal(x.result.ok,false);
 assert.equal(x.reloads,0);
 assert.match(x.original,/Existing shop/);
});
