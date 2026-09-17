# Output schema & conventions

The sweep writes exactly one JSON file per run via `scripts/write-results.js`
(stdin → `data/sweeps/sweep-<sweepDate>-<suffix>.json`, gitignored). Field names
match the historical `rental-radar-sweep` format in
`docs/planning/archived-sweeps.md` — do not invent new names for the same concepts.

## Record shape

```json
{
  "sweepDate": "2026-06-20",
  "meta": {
    "searchCount": 6,
    "durationMin": 4,
    "method": "playwright-mcp",
    "notes": "...",
    "errors": [],
    "tokensBurned": 0,
    "kind": "live-sweep",
    "source": "browser-sweep"
  },
  "searchParameters": {
    "reservationDate": "2026-07-06",
    "rentalLengthDays": 7,
    "tokenBudget": 1,
    "carClass": "economy",
    "time": "10:00"
  },
  "observations": [
    {
      "company": "Budget",
      "branch": "Norwood Airport",
      "carClass": "economy",
      "pickupDate": "2026-07-06",
      "returnDate": "2026-07-13",
      "days": 7,
      "weeks": 1,
      "totalUsd": 311.54,
      "quote": null,
      "notes": "all-in incl. taxes & fees",
      "source": "browser-observed"
    }
  ]
}
```

`write-results.js` adds `type: "rental-radar-sweep"` and the filename suffix; you
supply everything above. `sweepDate` defaults to today if omitted.

## Field conventions (must preserve)

- **One file per sweep run, never per target date.** All observations from a run —
  every brand × branch × fanned pickup date — go in one `observations` array.
- **Never append to or edit an existing sweep file.** Each run writes a fresh file;
  the random suffix only avoids same-day collisions.
- `totalUsd` (a number), not `price` + `currency`. Everything is USD by convention.
- `quote` is a separate, optional field for a non-final/estimated price alongside
  `totalUsd`. Prefer a real all-in `totalUsd`; use `quote` only when no true total
  surfaced. On failure set `totalUsd: null` and explain in `notes`.
- `branch`, not `location`, for the specific company location.
- `carClass`, not `vehicleClass`.
- `source` may appear at both `meta` (run provenance) and per-observation level:
  `receipt-actual`, `receipt-estimated`, `contract-current`, `user-observed`,
  `browser-observed`.
- `meta.kind` distinguishes a `live-sweep` from a `history-backfill`.

## How this answers the scan-day question

The scan day (`sweepDate`) is recorded as its **own dimension**, separate from each
observation's target `pickupDate`. The same target day observed on different scan
days produces different files — never an overwrite — so price drift toward a target
date is fully reconstructable. `sweepDate` is recorded, not used to drive polling.
