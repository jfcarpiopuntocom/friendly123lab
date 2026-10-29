'use strict';
// LAB ONLY: intentionally RED. This counterexample challenges v615's duplicate
// alias "recovery" without reading any real customer/license/browser storage.
// Never merge this test into the production source or rewrite the notebook.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../docs/mock-backend.js'),'utf8');
const start=source.indexOf('    cambiar(licencia, opts) {');
const end=source.indexOf('    /* CLAIM / MERGE',start);
assert.ok(start>=0&&end>start);
const cambiar=source.slice(start,end);
const A='F123-SYNTHETIC-A',B='F123-SYNTHETIC-B';

function reproduce(actualShopName){
  const m=new Map([
    ['f123_owned',JSON.stringify({licenseCode:B,instanceId:'synthetic-only'})],
    ['f123_tienda_activa',''],
    ['f123_tiendas',JSON.stringify({[A]:'',[B]:''})],
    ['f123_join_pending_v1',JSON.stringify({licenseCode:B,instanceId:'synthetic-only'})],
    ['f123_estado_v4_A',JSON.stringify({nombreNegocio:actualShopName,productos:[{id:'synthetic-item',existencia:12}]})]
  ]);
  const body=[
    'const localStorage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};',
    'const _normLic=c=>String(c||"").trim().toUpperCase().replace(/\\s+/g,"");',
    'const _licenciaPropia=()=>JSON.parse(localStorage.getItem("f123_owned")).licenseCode;',
    'const _licenciaActual=()=>B;',
    'const OC_STATE_SUFIJO="";',
    'const guardarEstadoLocal=()=>{};',
    'const window={OCSyncControl:{fijarSala:()=>({ok:true})}};',
    'const location={reload:()=>{}};',
    'const obj={'+cambiar+'};',
    'const result=obj.cambiar(B,{desde:B});',
    'return {result,selected:localStorage.getItem("f123_tienda_activa"),rawOriginal:localStorage.getItem("f123_estado_v4_A")};'
  ].join('\n');
  return new Function('m','B',body)(m,B);
}
test('control: old notebook A in legacy slot can switch to empty isolated B without deleting A',()=>{
  const r=reproduce('Store A');
  assert.equal(r.selected,'::'+B);
  assert.match(r.rawOriginal,/Store A/);
});
test('P0 RED: if the intended Store B already occupies legacy slot, rejoining B must NOT hide it',()=>{
  const r=reproduce('Store B');
  assert.match(r.rawOriginal,/Store B/,'real customer data has not been erased');
  assert.equal(r.selected,'','no proven identity evidence justifies moving away from the existing B notebook');
});
// Both inputs have IDENTICAL alias registry, stored license and pending join.
// Only the untrusted visible name differs. The current join code makes the same
// choice in both. A safe fix needs independent notebook identity evidence, not
// a heuristic based on number of products, local display name or alias order.
