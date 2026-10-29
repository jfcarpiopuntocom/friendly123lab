'use strict';
// Audit-only probes, synthetic/no business secrets; DO NOT merge to production.
// These checks locate trust-boundary questions, not proof of exploitation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sync=fs.readFileSync(path.join(__dirname,'../docs/sync-yjs.js'),'utf8');
const backend=fs.readFileSync(path.join(__dirname,'../docs/mock-backend.js'),'utf8');
const queue=fs.readFileSync(path.join(__dirname,'../docs/sync-realtime.js'),'utf8');

test('P0 boundary probe: role PIN metadata is written to shared Yjs map',()=>{
  // Encryption of transport is not equivalent to access control among
  // all devices authorized to decrypt the same Yjs room.
  assert.match(sync,/API\.meta\.set\("pinsRol",\s*pinsNext\)/);
  assert.match(sync,/API\.meta\.get\("pinsRol"\)/);
});
test('P0 boundary probe: a checkpoint serializes per-user PINs',()=>{
  const f=backend.indexOf('estadoParaCheckpoint()');
  assert.ok(f>=0);
  assert.match(backend.slice(f,f+13000),/usuarios:\s*usuarios\.map\(\(u\)\s*=>\s*\(\{\s*id:\s*u\.id,\s*nombre:\s*u\.nombre,\s*pin:\s*u\.pin/);
});
test('P0 contract probe: the same operation is delivered to Yjs even when local queue refuses it',()=>{
  const begin=queue.indexOf('window.OCSyncEmit = function');
  const end=queue.indexOf('function encolar(op)',begin);
  assert.ok(begin>=0&&end>begin);
  const f=queue.slice(begin,end);
  const a=f.indexOf('const encolada = encolar(op)');
  const b=f.indexOf('new CustomEvent("oc-op-local"');
  const c=f.indexOf('if (!encolada) return false');
  assert.ok(a>=0&&a<b&&b<c,'Yjs can receive op even when queue write fails');
  // Required follow-up for Greptile: trace whether the call site interprets
  // this false as a rollback, and which transport is actually durable.
});
