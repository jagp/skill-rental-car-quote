--- 
name: skill-rental-car-quote
description: Sweeps rental car prices across companies for one or more target pickup dates and records the observations for price-trend tracking. Use when asked to check, track, or log rental car quotes/prices.
---

# Rental Car Quote Sweep

Searches for rental car prices across companies/branches for one or more
target pickup dates, then records every observation from the run as a
single sweep file.

## Recording results

After collecting observations for a sweep, call `scripts/write_results.js`
with a JSON payload on stdin:

```json
{
  "sweepDate": "2026-06-20",
  "meta": {
    "searchCount": 6,
    "durationMin": 4,
    "method": "chrome",
    "notes": "...",
    "errors": [],
    "tokensBurned": 0,
    "kind": "live-sweep",
    "source": "gmail-receipts"
  },
  "searchParameters": {
    "pickupDate": "2026-07-06",
    "returnDate": "2026-07-13",
    "location": "...",
    "carClass": "economy",
    "time": "10:00"
  },
  "observations": [
    {
      "company": "Enterprise",
      "branch": "...",
      "carClass": "economy",
      "pickupDate": "2026-07-06",
      "returnDate": "2026-07-13",
      "days": 7,
      "weeks": 1,
      "totalUsd": 412.5,
      "quote": null,
      "notes": "...",
      "source": "receipt-actual"
    }
  ]
}
```

```bash
node scripts/write_results.js < payload.json
```

This writes one file to `data/sweeps/sweep-<sweepDate>-<suffix>.json`
(gitignored — sweep output is data, not code, and never committed).

### Conventions to preserve

- **One file per sweep run, never per target date.** If a single run
  checks several pickup dates and/or companies, all of those go in one
  `observations` array in one file. Do not write a separate file per
  target date searched.
- **Never append or edit existing sweep files.** Each run writes a brand
  new file; the random suffix in the filename exists only to avoid
  collisions when a sweep is run more than once on the same day.
- **Field names match the historical `rental-radar-sweep` format** (see
  `docs/planning/archived-sweeps.md` on `develop`) — don't introduce new
  field names for the same concepts:
  - `totalUsd`, not `price` + `currency` (everything is USD by
    convention; the field name carries the currency).
  - `quote` is a separate, optional field for a non-final/estimated price
    alongside `totalUsd`.
  - `branch`, not `location`, for the observation's specific
    company location.
  - `carClass`, not `vehicleClass`.
  - `source` can appear at both `meta` (overall sweep provenance) and
    per-observation level, with values like `receipt-actual`,
    `receipt-estimated`, `contract-current`, `user-observed`.
  - `meta.kind` distinguishes a live sweep from a `history-backfill`.
