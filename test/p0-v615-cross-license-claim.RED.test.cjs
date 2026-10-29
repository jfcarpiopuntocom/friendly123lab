'use strict';
// LAB ONLY: intentionally RED against v615. Exact reconciliar() method extracted.
// Tests must never use any real license, customer or PIN.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../docs/mock-backend.js'),'utf8');
const start=src.indexOf('    reconciliar(licencia) {');
const end=src.indexOf('  };\n\n  function _catalogoInterno',start);
assert.ok(start>0&&end>start);
const method=src.slice(start,end).replace(/,\s*$/, '');
const A='F123-SYNTHETIC-A',B='F123-SYNTHETIC-B';
function run(target){
  const local=new Map([['f123_owned',JSON.stringify({licenseCode:A,instanceId:'synthetic-device'})],['f123_tienda_activa',''],['f123_tiendas','{}'],['f123_estado_v4_A',JSON.stringify({nombreNegocio:'Own shop',ventas:[{id:'sale-1'}]})]]);
  const script=[
   'const _normLic=x=>String(x||"").trim().toUpperCase().replace(/\\s+/g,"");',
   'const _licenciaActual=()=>A;',
   'const localStorage={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v))};',
   'let changed=0,syncChanged=0;',
   'const window={OCTienda:{cambiar(){changed++;return {ok:true,cambiado:true}}},OCSyncControl:{fijarSala(){syncChanged++},resincronizar(){}},dispatchEvent(){}};',
   'const CustomEvent=class{constructor(type,opts){this.type=type}};',
   'const obj={'+method+'};',
   'const result=obj.reconciliar(target);',
   'return {result,owned:JSON.parse(local.get("f123_owned")).licenseCode,active:local.get("f123_tienda_activa"),old:local.get("f123_estado_v4_A"),changed,syncChanged};'
  ].join('\n');
  return new Function('local','A','target',script)(local,A,target);
}
test('P0 RED: cross-license claim must reject BEFORE mutating identity or room',()=>{
 const s=run(B);
 assert.equal(s.result.ok,false,'no verified transfer exists; require fail-closed');
 assert.equal(s.owned,A,'owner identity remains unchanged on rejection');
 assert.equal(s.changed,0,'must not call in-place notebook switch');
 assert.equal(s.syncChanged,0,'do not point room at a different license');
 assert.match(s.old,/Own shop/);
});
test('control: repeat same-license reconciliation remains allowed',()=>{
 const s=run(A);
 assert.equal(s.result.ok,true);
 assert.equal(s.owned,A);
});
