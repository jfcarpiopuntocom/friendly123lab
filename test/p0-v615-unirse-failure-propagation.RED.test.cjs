'use strict';
// LAB ONLY: deliberately RED; executes the real v615 unirse() method with
// isolated synthetic dependencies. No real device, license, PIN or customer data.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../docs/sync-realtime.js'),'utf8');
const from=code.indexOf('    unirse(codigo) {');
const to=code.indexOf('    desactivar() {',from);
assert.ok(from>=0&&to>from);
const unirse=code.slice(from,to).replace(/,\s*$/, '');
const A='F123-SYNTHETIC-A',B='F123-SYNTHETIC-B';
test('P0 RED: unirse must not acknowledge success when notebook switch returned failure',()=>{
  const local=new Map([
    ['f123_owned',JSON.stringify({instanceId:'synthetic-device',licenseCode:A})],
    ['f123_tienda_activa',''],
    ['f123_sync_room',JSON.stringify({codigo:B})]
  ]);
  const context=[
    'const localStorage={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v))};',
    'const normalizarCodigo=x=>x;',
    'const _esLord=()=>false;',
    'const _registrarAcceso=()=>{};',
    'const leerSala=()=>({codigo:B});',
    'const self={crypto:{randomUUID:()=>"synthetic-id"}};',
    'const window={OCTienda:{licenciaActual:()=>A,cambiar:()=>({ok:false,error:"QuotaExceededError"})},dispatchEvent(){}};',
    'const CustomEvent=class{constructor(name,options){this.type=name;this.detail=options?.detail}};',
    'const console={error(){}};',
    'const obj={'+unirse+',activar:()=>({ok:true})};',
    'return obj.unirse(B);'
  ].join('\n');
  const actual=new Function('local','A','B',context)(local,A,B);
  assert.equal(actual.ok,false,'failure must be propagated; cannot return an earlier successful activate()');
});
