# Browser control — driver, token levers, batching

How to drive the browser for a sweep at minimum token cost. Loaded on demand;
`SKILL.md` only needs the one-line summary.

## Driver hierarchy (hybrid)

1. **Playwright MCP — primary.** Acts on the accessibility tree / DOM via element
   references (`@ref`), not pixels. ~5–8× cheaper per action than vision
   (~200–400 tokens/snapshot vs ~1,200–1,600/screenshot). Built-in load waiting,
   element waiters, popup/dialog handling, and `storageState` persistence.
2. **Computer Use (vision) — fallback only.** Use *only* for things the tree can't
   express: CAPTCHAs, bot-detection interstitials, canvas/overlay widgets that
   don't appear as elements. Each fallback screenshot costs ~10× a snapshot, so
   reach for it deliberately, not by default.

Decision rule: try the MCP element path first; drop to vision for one action only
when the element isn't in the snapshot, then return to MCP.

## Token levers (apply on every run)

- Prefer accessibility snapshots over screenshots; capture **one** screenshot per
  *completed* quote for the record, not per step.
- If a screenshot is needed, keep resolution at ~1280×720; avoid max resolution.
- Keep only the last few screenshots in context; let older ones drop.
- Reuse stored selectors across runs so repeat sweeps don't re-pay element
  discovery. Persist `storageState` (cookies/session) per brand.

## Observe-point batching

A batch executes a *fixed* action sequence and cannot branch mid-batch. So segment
each brand's flow at the points where the next action depends on what the page
returned — the **observe points**:

1. After entering the location → read the branch autocomplete/dropdown and pick
   the exact in-range branch from the plan (don't assume position).
2. After setting dates + car class → read the quote (and confirm the branch).

Run the deterministic steps between observe points as one batch; stop at each
observe point to read state, then continue. One screenshot at the final quote.

## Reliability levers

- Use condition-based waits (`wait_for_load_state`, element waiters) — never fixed
  sleeps as the primary mechanism. These car sites are JS-heavy and slow; the
  archived sweeps show repeated 30s CDP screenshot timeouts on Enterprise from
  hammering screenshots — another reason to favor snapshots.
- Dismiss cookie/consent banners and upsell interstitials up front per
  `references/brand-catalog.md`.
- **Capture the all-in total, not the per-day×days base.** Most brands only reveal
  taxes/fees late in the funnel (Enterprise especially). Walk to the page that
  shows the total; record `quote` (estimate) only if a true total never appears.

## Error isolation

Per-brand try/continue: if a brand fails (timeout, no branch match, bot wall),
record an observation with `totalUsd: null` + a `notes` reason and move to the next
brand. **Never abort the whole sweep for one brand.** Roll all failures into
`meta.errors` for the single output file.

## Concurrency

One active tab at a time per session is the safe assumption; pre-opening N tabs and
"taking control" does not give true parallelism and risks DevTools contention.
Harvest sequentially in plan order (cheapest brands first, so a truncated run still
captures the most likely deals).

## Unverified (do not over-trust)

Exact per-action MCP token figures vary by source; treat the 5–8× advantage as
directional. Native multi-tab parallelism for Computer Use was unconfirmed as of
the research date.
