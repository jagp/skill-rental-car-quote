# Rental Radar — Sweep Prompt (v4)
## name
rental-rates-daily-check

## Description
Sweep local branches for the best price available

## Objective

Run the scheduled car-rental price sweep. For each company in the table, capture one

**Economy** quote for a fixed forward date window, screenshot the result, and write a

**single valid JSON file** to Google Drive that the Rental Radar artifact auto-loads.



One file per sweep. Do not abort the whole sweep for a single company's failure — log it

and continue.



---



## Inputs



### `companies` (table)

Each row:

```

{

  "name":           "Enterprise",                 // display name

  "reservationUrl": "https://www.enterprise.com", // booking entry point

  "zip":            "02062",                       // fallback location key

  "branchHint":     "Norwood, MA"                  // optional disambiguator

}

```



### `defaults` (computed at run time)

| Field        | Value                          | Notes                                  |

|--------------|--------------------------------|----------------------------------------|

| `pickupDate` | today + 1 day                  | JSON: `YYYY-MM-DD`; form: `MM/DD/YYYY`  |

| `returnDate` | `pickupDate` + 7 calendar days | same formatting rule                    |

| `pickupTime` | `10:00`                        | 10:00 AM local to branch                |

| `carClass`   | `Economy`                      | fall back to lowest-cost class          |



---



## Per-company quote procedure (`getQuote`)



For one company, in its own tab:



1. **Navigate** to `reservationUrl`. The booking form is usually at the top of the homepage.

2. **Pickup location.** Find the location field (aliases: "Pick-up Location", "From",

   "Where", "Local office"). Type `branchHint` if present, else `zip`. Pause after typing

   so the autocomplete can populate. Select the option that **exactly** matches the target

   region — do not accept the first row if its state/metro is wrong (e.g. wait past

   "Norwood, MD" for "Norwood, MA"). Some sites defer matching until submit; some use a

   popup picker instead of a list — handle both.

   - **Fallback chain:** branchHint → zip → quick web search (sub-agent) for the ZIP →

     if still no match, record an error for this company and move on.

   - Confirm the field is populated before continuing, unless matching is deferred.

3. **Return location** = same as pickup. Toggle any "same drop-off" checkbox if shown.

4. **Dates.** Enter `pickupDate`, then `returnDate`. Prefer typing `MM/DD/YYYY`; otherwise

   drive the calendar widget. Set time to `pickupTime` if a time field exists.

5. **Car class.** If a class selector appears, choose Economy (or cheapest available).

6. **Reach the quote.** Leave age / coupon / loyalty / membership fields on default. Only

   touch them if a required-field error blocks the quote — then use best judgment.

7. **Extract:** total quote price and the branch name/address actually selected.

8. **Screenshot** the results view showing dates, location, and price. Name:

   `{sweepDate} - {company} - {pickupDate:MM-DD} - {rate}`.



Return per company: `{ company, branch, quote, carClass, pickupDate, returnDate,

screenshot, status, error? }`.



---



## Batching with `browser_batch` — map, then execute



Two passes.



**Pass 1 — build the plan (no browser).** Loop the companies table and assemble a

per-company *batch plan*: the computed params (URL, location string, dates, screenshot

name) plus the ordered sequence of browser calls to make. Hold all plans in working

memory. Don't touch the browser yet.



**Pass 2 — execute the plan (batch loop).** Loop the plans and submit each company's call

sequence through `browser_batch` (one round trip per batchable run).



The constraint that shapes the plan: a batch runs a **fixed** sequence — it can't branch on

what a page returns mid-batch. The dynamic widgets (location autocomplete, calendar) need

you to *read page state and decide* before the next call. So you can't pre-map every click

blindly; segment each plan at these **observe points**, where the batch breaks and you

read + decide:



| Batchable run                                        | → Observe point                                              |

|------------------------------------------------------|--------------------------------------------------------------|

| navigate → locate form → type location               | read autocomplete; pick exact-region match (fallback branchHint → zip → web-search ZIP); confirm field populated |

| dates → return-location toggle → car class → advance  | read quote price + selected branch                           |

| screenshot                                           | —                                                            |



If `browser_batch` does support full parallel stateful sessions per item (you indicated it

seems to), Pass 2 can fan all companies out in one go instead of looping — the observe-point

segmentation still applies *inside* each item.



**Error isolation:** wrap each plan's execution in continue-on-error. A failure records

`status: "error"` + the reason in memory and the loop proceeds to the next company.



---



## State & output



**Keep state in memory during the loop.** Accumulate observations, errors, screenshot

names, and timing in working memory. Do not write to Drive mid-loop — serialize once, at

the end.



**Write to Drive only on a successful run.** Treat a run as successful if the sweep

completed without a fatal abort (browser reachable, loop finished) **and** produced at

least one `status: "ok"` observation. On a fatal abort or an all-error sweep, skip the

Drive write and report inline — this keeps a bad run from overwriting good prior data.

*(Confirm this is the success bar you want; the alternative is "write whenever the loop

finishes, even all-error.")*



On success:

1. `Drive MCP create_file()`

2. `contentMimeType` = `application/json`

3. `filename` = `rental-radar-sweep-{sweepDate}.json`

   - If a file for today already exists (rerun), append `-N`: `...-{sweepDate}-2.json`,

     `-3`, and so on. First run of the day has no suffix.

   - The load name isn't hardcoded, so the artifact side should pick the **newest** match

     (highest `-N` for the date, else most recent overall) — worth confirming the artifact

     does this, or stale files will load.

4. Content = **one valid JSON object, no prose, no fences** (braces not parens, no trailing

   commas), per the schema below.



```json

{

  "type": "rental-radar-sweep",

  "sweepDate": "YYYY-MM-DD",

  "meta": {

    "searchCount": 0,

    "durationMin": 0,

    "method": "chrome",

    "notes": "",

    "errors": [

      { "company": "", "step": "", "message": "" }

    ],

    "tokensBurned": 0

  },

  "observations": [

    {

      "company": "",

      "branch": "",

      "quote": "",

      "carClass": "Economy",

      "pickupDate": "YYYY-MM-DD",

      "returnDate": "YYYY-MM-DD",

      "screenshot": "",

      "status": "ok"

    }

  ]

}

```



Rules for the object:

- `errors` is an **array** (empty `[]` if none) — not a string.

- Numeric fields (`searchCount`, `durationMin`, `tokensBurned`) are numbers, not `""`.

- One `observations` entry per company, including failed ones (with `status: "error"`).

- Fill every field you can from real data; leave unknowns as `""` / `0`, never omit keys.