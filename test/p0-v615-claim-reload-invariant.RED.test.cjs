'use strict';
// LAB ONLY — intentionally RED against v615. No production data or keys.
// Executes both REAL methods: reconciliar() -> cambiar() with synthetic storage.
// It models the boot selector reading exactly the persisted active-namespace
// key, unlike old harnesses that checked only *in-memory* products pre-reload.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../docs/mock-backend.js'),'utf8');
const from=source.indexOf('    cambiar(licencia, opts) {');
const mid=source.indexOf('    /* CLAIM / MERGE',from);
const end=source.indexOf('  };\n\n  function _catalogoInterno',mid);
assert.ok(from>=0&&mid>from&&end>mid);
const methods=source.slice(from,end);
const A='F123-SYNTHETIC-A',B='F123-SYNTHETIC-B';
test('P0 RED: successful owner claim MUST still open the same stock/ledger after next boot',()=>{
 const disk=new Map([
  ['f123_owned',JSON.stringify({licenseCode:A,syncCode:A,instanceId:'synthetic-device'})],
  ['f123_tienda_activa',''],
  ['f123_tiendas','{}'],
  ['f123_estado_v4_A',JSON.stringify({nombreNegocio:'Existing shop',productos:[{id:'synthetic-sku',stock:12}],ventas:[{id:'synthetic-sale'}]})]
 ]);
 const code=[
  'let reloads=0;',
  'const localStorage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,String(v))};',
  'const _normLic=c=>String(c||"").trim().toUpperCase().replace(/\\s+/g,"");',
  'const _licenciaPropia=()=>JSON.parse(localStorage.getItem("f123_owned")).licenseCode;',
  'const OC_STATE_SUFIJO="";',
  'const _licenciaActual=()=>OC_STATE_SUFIJO?OC_STATE_SUFIJO.slice(2):_licenciaPropia();',
  'const guardarEstadoLocal=()=>{};',
  'const location={reload:()=>{reloads++}};',
  'const CustomEvent=class{constructor(t,v){this.type=t;this.detail=v?.detail}};',
  'const window={OCSyncControl:{fijarSala:()=>({ok:true}),resincronizar:()=>({ok:true})},dispatchEvent(){}};',
  'const obj={'+methods+'}; window.OCTienda=obj;',
  'const claim=obj.reconciliar(B);',
  'const ns=localStorage.getItem("f123_tienda_activa")||"";',
  'const bootRaw=localStorage.getItem("f123_estado_v4"+ns+"_A");',
  'return {claim,ns,reloads,bootRaw,original:localStorage.getItem("f123_estado_v4_A")};'
 ].join('\n');
 const r=new Function('disk','B',code)(disk,B);
 assert.match(r.original,/synthetic-sku/,'old records remain stored');
 if(r.claim.ok){
  assert.ok(r.bootRaw&&r.bootRaw.includes('synthetic-sku')&&r.bootRaw.includes('synthetic-sale'),
   'a successful claim must NOT point next boot to an empty namespace');
 }else{
  assert.equal(r.ns,'','a rejected claim must keep the original notebook pointer');
 }
});
