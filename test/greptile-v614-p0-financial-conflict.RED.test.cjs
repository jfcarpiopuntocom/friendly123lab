'use strict';
// AUDIT-ONLY, intentionally RED until the conflict contract is implemented.
// This file lives exclusively in friendly123lab PR #1; never ship it as a
// production regression or use real customer/licence credentials.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const LG=require('../docs/core/ledger.js');
const locations=[{id:'synthetic-own-rack',tipo:'propio'}];
const sale=(id,amount)=>({
  id,fecha:'2026-10-29T10:00:00.000Z',ubicacionId:'synthetic-own-rack',
  productoId:'synthetic-item',cantidad:1,precioUnit:amount,split:null
});
const base=ventas=>({
  ventas,ajustes:[],payouts:[],gastos:[],cartera:[],ubicaciones:locations
});
test('control: identical retransmission with the SAME sale ID is idempotent',()=>{
  const single=LG.buildLedger(base([sale('idempotent-1',10)]));
  const repeated=LG.buildLedger(base([sale('idempotent-1',10),sale('idempotent-1',10)]));
  assert.deepEqual(repeated.entries,single.entries);
});
test('control: two real sales with DIFFERENT IDs both contribute to the ledger',()=>{
  const ledger=LG.buildLedger(base([sale('different-a',10),sale('different-b',10)]));
  assert.equal(ledger.entries.filter(e=>e.factKind==='venta').length,2);
});
test('P0 hypothesis RED: conflicting versions of SAME sale ID must require owner review',()=>{
  const ledger=LG.buildLedger(base([sale('conflicted-1',10),sale('conflicted-1',20)]));
  // Same-ID conflicting economic facts are NOT a permitted idempotent replay.
  // Picking a JSON-lexicographic winner without a warning must fail this test.
  assert.ok(
    ledger.errors.some(e=>e.factKind==='venta'&&e.factId==='conflicted-1'&&/conflict|colisi|review|revisi/i.test(e.motivo||'')),
    'conflicting sale versions require explicit financial review; no silent winner'
  );
});
