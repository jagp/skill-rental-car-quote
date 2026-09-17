# Rental Radar — pipeline map

The atomic sweep skill (this repo's `SKILL.md`) is one node in a larger pipeline.
This is the fresh, authoritative node/edge map. The older `*.v3.md` / `*.v4.md`
drafts in this folder are historical context only — not specs.

Design principle: push everything that changes rarely or is deterministic to the
edges (setup + yearly research + the in-code planner) so the every-run node spends
tokens only on what genuinely changes — live quotes.

## Nodes

### A. Setup skill — `setup-rental-radar-defaults` (run ~once, ever) — SKETCH
Snapshots local conditions to produce durable defaults.
- **Inputs:** user home ZIP.
- **Does:** finds candidate branches per brand near home, keeps those within the
  gas-breakeven distance (`scripts/plan-sweep.js` exposes the same 600-mile hard
  cap), records road `distanceMiles`; picks a sensible default token budget.
- **Outputs:** real `config/branches.json` (replaces the seed); default token budget.
- **Edge →** feeds C.

### B. Yearly research skills (run ~annually or on manual trigger) — SKETCH
Refresh the slow-moving catalog. Sub-agent driven (fan out web research).
- **B1 — tier labels:** confirm each brand's lowest-tier label + ACRISS code →
  update `config/car-tiers.json` (`lastVerified`). Triggered automatically when the
  planner reports a brand in `staleTiers` (>365 days), or manually.
- **B2 — branch catalog:** refresh the per-state branch lists feeding A.
- **Edge →** feeds C (and A).

### C. Atomic sweep skill (run every time) — BUILT (this repo)
- **In code (`scripts/plan-sweep.js`):** expand config → ordered batch plan
  (priority order, gas-breakeven branch filter, token-budget branch count + day
  fan-out, stale-tier flags).
- **Natural language (`SKILL.md` + `references/`):** drive the browser per brand,
  capture all-in totals, isolate failures.
- **Edge →** hands observations to D.

### D. Data sink (`scripts/write-results.js`) — BUILT
One immutable JSON file per run → `data/sweeps/` (local only, gitignored). Records
`sweepDate` (scan day) as a dimension distinct from each observation's `pickupDate`.
- **Edge →** read by E.

### E. Rental Radar Sweep artifact (external) — out of scope here
The decision tool that consumes accumulated sweep data to advise *when/where* to
rent over long periods.

## Edges

```
home ZIP ─▶ [A setup] ─▶ branches.json ─┐
                                         ├─▶ [C atomic sweep] ─▶ [D data sink] ─▶ [E Rental Radar]
[B yearly research] ─▶ car-tiers.json ───┘        ▲
        ▲                                         │
        └──────── staleTiers trigger ◀────────────┘
```

## Open questions (deferred, not blocking the atomic node)

- **Brand elimination:** can any brand be dropped given an unambiguous
  always-more-expensive pattern? Collect data now (C never eliminates on its own);
  decide later in E.
- **Token-budget calibration:** the `branchesPerUnit` / `datesPerUnit` constants in
  `plan-sweep.js` are first-pass; tune against real token measurements from C.
- **Near-term price dips:** dynamic-pricing dips near the target date are captured
  by the scan-day dimension; modeling them belongs in E.
