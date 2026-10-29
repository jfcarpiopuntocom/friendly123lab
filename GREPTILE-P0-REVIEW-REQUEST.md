# Independent P0 review request — friendly-123 v614

**Scope**: read-only audit of the exact v614 snapshot in this public lab repository. Production is a separate GitHub Pages deployment; do not apply suggested fixes or merge this PR automatically.

## Three concrete hypotheses to investigate

### 1. Money: conflicting same-ID sale variants
- `docs/core/ledger.js` has `dedupe(list,keyFn)` that picks the lexicographically smallest `JSON.stringify` for duplicate IDs.
- `buildLedger()` uses that for `ventas`, `ajustes`, `gastos`, `cartera`, while payout conflicts receive separate explicit review handling.
- **Question:** When two replicas present the same sale ID but incompatible price, product, quantity, payment, or commission, can the ledger silently select a legitimate-looking winner without any owner-review signal? Conversely, how are authorized economic corrections represented without a false conflict?
- **Acceptance:** no invented winner; duplicate delivery is idempotent; two genuinely separate identical sales with different IDs both count; authorized corrections are preserved.

### 2. PIN confidentiality and revocation
- `docs/sync-yjs.js` shares `_meta.pinsRol`; `docs/mock-backend.js` adopts replicated `pinsRol`; checkpoints may include `usuarios[].pin`.
- **Question:** Can an employee or a newly enrolled non-owner device read or restore the owner PIN from local IDB, Yjs history, exported notebook, or cached checkpoint? Can old role credentials reappear after a role PIN update or revocation?
- **Acceptance:** verify effective trust boundary and decryption privileges with focused adversarial tests, not merely the presence of AES-GCM in transport. Preserve existing legitimate PINs and avoid mass migration.

### 3. Queue/Yjs race under storage failure
- `docs/sync-realtime.js`: `OCSyncEmit` calls `encolar(op)`, then dispatches `oc-op-local` to Yjs even if the queue failed, then returns `false`.
- **Question:** Is there an observed sequence where a caller interprets `false` as save failure or rolls back an operation while Yjs has already published it (or where receipt is displayed but neither path is durable)? Trace callers, DB commit order, ACK, and abort semantics.
- **Acceptance:** one economic operation ID, durable and recoverable before success is shown, and no phantom/duplicated sale.

## Strict constraints
- Zero real PINs, licenses, client records, or credentials in comments or tests.
- Do not change product design, yellow `#EFC31A`, navy outline `#1D2E43`, Opera Air PIN workflow, or deployment.
- No massive redesign, new sync provider, or blanket rewrite. Rank only proven P0/P1 issues and propose smallest reversible patch with a RED reproduction and a GREEN regression.
- Greptile reviewer: explain each suspected defect as **file:line, call path, causal sequence, observability, and focused test**. Explicitly mark claims that depend on assumptions and are not yet demonstrated.
- This is an *audit request document*, not evidence of a Greptile result.
