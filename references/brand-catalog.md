# Brand catalog — per-brand booking-site idiosyncrasies

On-demand library. Each brand is its own browser flow and its own competitor;
nearby branches differ per brand, so do not try to cover several brands with one
flow even where they share a corporate parent. Priority/ordering and URLs live in
`config/companies.json`; lowest-tier labels live in `config/car-tiers.json`. This
file holds the navigation quirks.

Flag inferred items as such; verify against the live page when in doubt.

## Cost ranking (drives priority order, not elimination)

- **Budget** — consistently the cheapest tier across sources (NerdWallet, Cheapism,
  Spacer). Checked first.
- **Enterprise / Alamo / National** — mid tier.
- **Hertz** — consistently the most expensive; checked last. *Do not eliminate* —
  we collect its data to support a possible future elimination decision, but the
  atomic sweep never drops a brand on its own.
- **Independents (Ace / Fox / Rent-a-Wreck)** — ~5% of US locations; thin coverage,
  marginal ROI. Gated behind a high token budget in `config/companies.json`.

## Per-brand notes

| Brand | Location entry | Lowest tier | Price display | Friction |
|---|---|---|---|---|
| Budget | ZIP/city → dropdown | Economy | All-in total relatively early (most transparent) | Cookie banner; intermittent bot-detection bounce to blank tab — retry |
| Enterprise | ZIP/airport → branch dropdown (most reliable); direct address less consistent | Economy | **Total only late** — defaults to per-day×days; taxes/fees at checkout. Walk to the end | Cookie popup; heavy JS render (CDP timeout risk — use snapshots) |
| Alamo | ZIP/airport → dropdown | Economy | Base early, total late | Standard cookie consent |
| National | ZIP/airport → dropdown | Economy | Base early, total late | Standard cookie consent |
| Avis | ZIP/city → dropdown | Economy | Base + itemized fees fairly visible | Cookie banner; member-rate prompts |
| Payless | ZIP/city → dropdown | Economy | Industry-norm (base early) | Thin branch coverage; assume separate engine from Avis/Budget |
| Dollar | ZIP/airport → dropdown | **Compact** | Base early, fees late | Airport-focused → few suburban branches; autocomplete may return no match |
| Thrifty | ZIP/airport → dropdown | **Compact** | Base early, fees late | Airport-focused → few suburban branches; autocomplete may return no match |
| Hertz | ZIP/airport → dropdown | Economy | Whole-dollar display; base early, fees late | Cookie/consent; documented cookie wall |
| Ace | ZIP/branch lookup | Economy (inferred) | Industry-norm (inferred) | Sparse docs; simpler/fewer popups |
| Fox | ZIP/branch lookup | Economy (inferred) | Industry-norm (inferred) | Sparse coverage |
| Rent-a-Wreck | ZIP/branch lookup | Economy (inferred) | Industry-norm (inferred) | Independent engine; sparse coverage |

## Cross-cutting implications

- **Tier-label trap:** "lowest tier" is **Compact** on Dollar/Thrifty but **Economy**
  elsewhere. Always select by the per-brand label from `config/car-tiers.json`; when
  that entry is stale, `plan-sweep.js` lists the brand in `staleTiers` — re-confirm
  the label with a quick search before selecting.
- **Total-not-base:** assume taxes/fees appear late; capture the all-in total.
  Budget is the main early-total exception.
- **Airport-only discount brands** (Dollar/Thrifty) frequently have no suburban
  branch near a home ZIP — a "no branch match" is expected, not an error to retry
  forever; record `null` and move on.
