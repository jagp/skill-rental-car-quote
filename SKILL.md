---
name: skill-rental-car-quote
description: Sweeps lowest-tier, full-week rental car prices across national US brands and nearby branches for one or more target pickup dates, then records every observation as a single sweep file for price-trend tracking. Use when asked to check, track, or log rental car quotes/prices.
---

# Rental Car Quote Sweep

The atomic data-collection step of the Rental Radar pipeline: harvest the cheapest
weekly quote from each national US rental brand at each nearby branch, for one or
more target pickup dates, and log the run as one immutable sweep file.

A deterministic planner decides **what to search**; you drive the browser to
**collect** it. Keep navigation detail in the reference files below — load them when
you need them.

## Procedure

1. **Plan (in code).** Run the planner with the target reservation date and a token
   budget (fluid scalar; higher = wider net, more cost):

   ```bash
   node scripts/plan-sweep.js <reservationDate YYYY-MM-DD> [tokenBudget] [rentalLengthDays]
   ```

   It returns the batch plan: companies in priority order (cheapest first), the
   in-range branches per company, the fanned pickup dates (each with
   `returnDate = pickup + rentalLengthDays`, default 7), search defaults
   (`carClass: economy`, `time: 10:00`), and a `staleTiers` list.

2. **Re-verify stale tiers.** For any brand in `staleTiers`, do a quick search to
   confirm its current lowest-tier label before selecting (its
   `config/car-tiers.json` entry is >365 days old). Update that file if it changed.

3. **Collect (browser).** For each company → branch → target in the plan, drive the
   browser per `references/browser-control.md`, selecting the lowest tier by the
   per-brand label and capturing the **all-in total** (not per-day×days). Handle
   each brand's quirks per `references/brand-catalog.md`. Isolate failures per
   brand: on error, record `totalUsd: null` with a reason and continue.

4. **Record (one file).** Accumulate every observation in memory, then write the
   whole run once:

   ```bash
   node scripts/write-results.js < payload.json
   ```

   This writes one gitignored file to `data/sweeps/sweep-<sweepDate>-<suffix>.json`.
   Output is data, not code — never committed. See `references/schema.md` for the
   exact payload shape and field conventions.

## References

- `references/browser-control.md` — Playwright-MCP-first (vision fallback), token
  levers, observe-point batching, per-brand error isolation.
- `references/brand-catalog.md` — per-brand location entry, lowest-tier label,
  price-display quirks, friction, and cost-based priority.
- `references/schema.md` — output record shape and field conventions.

## Config

- `config/companies.json` — brands, reservation URLs, priority order, token-budget gate.
- `config/branches.json` — nearby branches (seed; real values from the setup node).
- `config/car-tiers.json` — per-brand lowest-tier label + staleness date.

## Baked-in assumptions (immutable by design)

National US brands; lowest tier only; pickup time fixed at 10:00; rental length
defaults to 7 days (overridable input, but only the default is used elsewhere); each
nearby branch is its own competitor. Branch reach is bounded by the gas-breakeven
distance, and search granularity by the token budget. The broader pipeline (one-time
setup, yearly research refresh) is sketched in `docs/planning/pipeline.md`.
