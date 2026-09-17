/skill-creator  /plan Help me create a new skill -- or a series of interconnected skills in a pipeline - which will assist me in finding the lowest cost rental cars available nearby, considering multiple rental companies, starting on different days, collecting changing data on an ongoing basis. The goal is to produce data for the Rental Radar Sweep artifact (a cowork project we've developed), a decision-making tool designed to assist users in determining when and where to rent cars over long periods of time (high value, low urgency).  This is the atomic core of that data collection goal:  it will drive the claude-in-chrome tool, searching the web for data which is not exposed by other APIs, and must be manually harvested via users.  We will automate the process of interacting with the large national car rental company websites, accounting for differences in their operation gracefully, and allow for performant batching of the tool calls to minimize token cost overhead as much as possible.  Given that each website operates slightly idiosyncratic nuances, the skill must utilize master-level software engineering techniques to architect a performant pipeline from start to finish.  This skill should be as focused as possible for maximum reusability, baking in some immutable assumptions from the start if doing so can ultimately be leveraged into cost effecincies somewhere down the chain.  Lets take a look at some examples of what I mean, and have you build a plan for what exactly this skill should do and drafting the other parts of the pipeline briefly but with clear nodes connecting the edges. Utilize subagents for specific needs



Assumptions to conisder:

Let's only use national US car companies. They have websites that can work identically regardless of each persons physical location.  

Let's only consider the price of full-week rental terms.  This will reduce lots of compliction related to varying rental periods.

We dont need to ever poll the same site for the same day.

Nearby branch locations should be treated as different competitors

Time of pickup should not effect the quote variation.  

Time of the quote collection may effect the quote, but we dont want something polling every site continuously.  We will record it to observe trends but will not factor it into the operation.

We are only looking at the lowest tier of car available, although diff companies may label them in non-intuitive ways.  

Car tiers will not change more than once a year.  We can make it semi-dynamic by simply searching for the tier name if we dont have fresh data on it in the past 365 days.

Branch locations will not change more than once a year.  If a location we've been polling ceases operation, we will not consider it and simply find the next in the list of options.

Rental  car companies do operate in cost-tiers as well, but we odnt know for sure how it breaks down yet or if geography effects quotes.  We are maximizing low-costs, not luxury, so we may want to include more Budget rental car branches or ones further away, than fore example Avis.  We want data to support this but not part of the atomic search.  Is it possible to eliminate any of them entirely, given a clear and unambiguous pattern of higher costs given identical terms?

We're looking at Enterprise/Alamo/National, Avis/Payless/Budget, Thrifty/Dollar/Hertz, Ace, Fox, Rent-a-Wrreck only

The goal is to not miss any great deals that pop up



How company-agnostic should our skill be?

We may need to spin off a subagent to evaluate this issue, and/or perform some more research to catalog the uneven landscape of rental company websites' user interfaces and evaluate which may actually impact the skill we're building now or the overall pipeline envisioned. 

Core example: In determinign pickup location: some company sites operate best from a user-supplied zipcode (or browser location awareness) which populates a dropdown of potentiual nearby branches the user can click on, vs some appear to work fine by directly entering an address or internal descriptor ("Norwood South")  . 

other examples: 

 

Some offer pop-ups which neeed to be closed, or navigated around.  

Some of the registration flows include an additional page step where they offer optional insurances or addons.  

Some offer dissimilar price breakdowns (Enterprise only shows "total" quite price at the end of their funnel, defaulting to "just the cost per day * number of days" value, showing taxes and fees only once reserved)

Some allow for right-click to open new tabs from the initial screen, others dont.  



Main design decision informing future scope:

By default, a user is searching using their own home zipcode.  We don'[t need to poll every location in america, because past a certain breakppoint the cost of gas would invalidate locations beyond a certain hard limit from consideration. Currently, we can assume rentsal car prices will not ever be lower than $20/day, anywhere in the country.  That defines a hard limit in terms of how distant we would ever need to look because the price of gas makes the breask-even point of a lower-cost, futher0-distance branch deterministic.  It willl vary slightly by geographic region but not by much. If there were no cost to run the skill, we could poll every brasnch in the US.  But token costs being high means we also can assume no user would ever want this.  The token cost actually beocmjoes the edtermining factor about how granular we want the search to be.  Some of this can be captured by a "cast a wider net at incresaed token cost" slider to allow a user to choose, but bounded by sane limits.   I want us to deeply think about this potential feature/skill input and bake it in from the earliest stage/smallest scale.



Data on the same day from different search pooints:

we know the price of a quite fluctuates as the day approaches, but it's not always clear how this trend works.  Making a reservation a year in advance will almost always mean lower cost than next week or next month.  However, I've observed that sometimes you can ifnd cheaper quotes in the very near term, presumably becauise the companies are doing fleet modelling to dynamically lower prices based on consumer demand.  How do we want to handle the collection of data in such a system?  A simjple imnplementation would be to hold a database cell for each day and overwrite it as it updates, but I think instead we want to track the input day (the day a scan is run) as part of the quote's input, increasing overhead and comparison, by adding another dimnension to the data.  Any input on how to handle this?



Browser tool batching

We need to learn about precisely how the claude-in-chrome tool works, and how it is affected by skill/tool requests batching.  Lets fire of a new deep learning research agent to summarize and inform this process in a token-efficient manner.  Does it matter if fopr example we have a user load up tabs for each nearby competitor and simply take control of them at the skill  level?  And is there any need tro consider other options I simply havent heard of to conmtrol the browser action? 



Instincts:

We can solove some of the uncertainties and mninimnize tokens by separating the whole pipeline into a skill which runs every time, and a skill more like a "setup good defaults useful over time based on a snapshot of local conditions right now" step the user perfoirms essentiually just once, ever, and whose output informs the more atomic skill.  There are also research poieces that are so universal it may make sense fo us to perform, eg, once a year - like finding a list of all the enterp-rise branches in each state, or something,.



Implementation:

How much of the analysis should be handled by actual in-code algoritihms vs natural language instructions?  

 

 PRESERVED WORK FROM CRASHED ULTRAPLAN SESSION:
 Where things stand:

The data-sink fork (storage + schema, matching the "I'll provide the Rental Radar schema" answer) is fully implemented and verified in this container, but this container has no GitHub push credentials — so I can't land it as a PR myself. I bundled it instead; pull it into a clone that has push access using the command above.
The other two forks (Hybrid Playwright+vision browser tool, atomic-sweep-only scope) were answered in the original ultraplan thread but never synthesized into a master plan — that synthesis needs to happen in that thread, since it holds the full research (ACRISS detail, platform-sharing evidence) that I only have a recap of here.

 Research 1:
 Research Claude-in-Chrome Batching
 I'm designing a Claude Code Skill that drives a browser to harvest car-rental price quotes, and I need to understand the browser-control tooling precisely so I can architect for minimum token cost. Do focused web research (WebSearch/WebFetch) and return a CONCISE, structured summary (not raw dumps). The current date is June 2026.

Research these questions:

1. **"Claude in Chrome" / Claude for Chrome**: What is Anthropic's browser-control product/tool as of 2025-2026? Is it a Chrome extension, a "computer use" capability, an MCP server (e.g. Playwright MCP / chrome-devtools MCP), or something else? How does Claude perceive and act on a page — screenshots + pixel coordinates, accessibility tree, or DOM/CSS selectors? Cite the mechanism.

2. **Token cost model of browser control**: What consumes tokens per browser action? (e.g. each screenshot re-sent into context, accessibility-tree snapshots, DOM dumps). What are the known token-efficiency techniques: limiting screenshot resolution, using text/accessibility snapshots instead of images, avoiding re-reading the full page each step, scoping to specific elements?

3. **Batching / parallelism**: Can multiple browser tabs or pages be controlled in one session? Is there any notion of batching multiple tool calls in a single model turn? Does opening N tabs up front and then "taking control" reduce per-site overhead vs sequential navigation? What's the realistic concurrency model — one active tab at a time, or true parallel tabs?

4. **Alternatives the user may not know about**: Briefly list other ways to programmatically drive a browser that integrate with Claude/Claude Code (Playwright MCP, chrome-devtools MCP, browser-use, Selenium via scripts, headless scripted scraping where the model only sees extracted text). For each, note the token-cost tradeoff vs an interactive vision-based agent.

5. **Determinism/reliability levers**: Anything about waiting for page loads, handling popups/cookie banners, and writing reusable selectors/scripts so repeated runs don't re-pay discovery cost.

Return: a tight bulleted summary organized by the 5 questions, with source URLs. Keep it under ~500 words. Flag anything you could NOT verify so I don't over-trust it.


Browsed the web, ran a command
Perfect. Now I have enough detail. Let me compile the structured summary.

CONCISE RESEARCH SUMMARY: Claude Browser-Control Token Architecture
1. Anthropic's Browser-Control Product (2025–2026)
Primary Tool: "Computer Use" API (Beta)

Native vision-based approach: Claude receives screenshots → perceives page visually → issues mouse/keyboard commands at pixel coordinates
Not Chrome extension; available via API (beta header: computer-use-2025-11-24) and Claude Code desktop app
Perception mechanism: Full screenshot (not accessibility tree)—Claude's vision model processes pixels directly
Action mechanism: Mouse clicks (X,Y coords), keyboard input, drag, scroll
Secondary Alternative: Playwright MCP

DOM/accessibility-tree approach (opposite of Computer Use)
Transmits structured element references (@e1, @e2, etc.) rather than screenshots
Efficiency: ~4x cheaper per interaction than vision-based (114K tokens MCP vs 27K CLI for typical task)
Trade-off: Cannot handle CAPTCHAs, visual overlays, or cookies banners that don't appear in the tree
Sources: Anthropic Computer Use Docs | Playwright MCP Setup | Browser Use vs Computer Use Comparison

2. Token Cost Model: Per-Screenshot & Per-Action Breakdown
Factor	Cost	Notes
Full-page screenshot (1280×720)	~1,200–1,600 tokens input	Sent on every action; main driver of cost
Screenshot (2000px tall, high-res)	~2,400–2,800 tokens	Opus 4.7+ supports up to 2576px long edge; costs ~3x more per pixel
Accessibility tree snapshot (Playwright)	~200–400 tokens per snapshot	Structured text; 5–8x cheaper than vision
Playwright CLI output (text snapshots)	~0.3x of MCP cost	Minimal re-transmission; best for repetitive flows
Token-Efficiency Techniques:

Resolution downscaling: Start at 1280×720 (Anthropic best practice); avoid max resolution unless critical
Snapshot replacement: Keep only 3–5 most recent screenshots in conversation history; replace older images with text placeholders
Element-based targeting: Use Playwright MCP's @ref system instead of pixel coords; survives layout changes, avoids re-sending full page
Batching selectors: Pre-compute CSS/XPath selectors; reuse across runs instead of rediscovering elements each session
Sources: Vision Token Pricing Guide | Screenshot Resolution Best Practices | Playwright vs Vision Token Benchmark

3. Batching & Parallelism: Concurrency Model
Current Reality (2026):

ONE active screen/tab at a time per Computer Use session
Multiple Claude Code instances competing for the same Chrome DevTools connection fail (tabs interfere, data corruption)
No built-in parallel tab support; feature requests exist but unimplemented
Workaround for Multiple Sites:

Separate browser profiles (userDataDir per agent in Playwright) + separate MCP connections
OR sequential navigation (one site → screenshot → query → next site)
External orchestration required; not native to Claude Code
Batching of Tool Calls:

Claude can issue multiple tool calls (click + type + screenshot) in one turn, but all operate serially on same screen
No true parallelism within a session; model must wait for each action result
For Your Car-Rental Use Case:

Pre-open N rental sites in N separate browser instances → manage via separate Claude sessions/MCP connections
Each session controls one browser, harvests one site sequentially
Token cost still includes full-page re-screenshot after every action per site
Sources: Parallel Sessions Issue #20100 | Multiple Concurrent Sessions Guide

4. Alternatives: Token-Cost Tradeoffs
Tool	Mechanism	Token Cost	Best For	Trade-offs
Claude Computer Use	Screenshots + vision	High (~1,200 tokens/action)	Complex UI, CAPTCHAs, visual overlays	Pixel-based coords break on resize; high context overhead
Playwright MCP	Accessibility tree + DOM	Low (~200–400 tokens/action)	Deterministic flows, form-filling, element-targeting	Can't read images, popups; requires structured DOM
Playwright CLI	Headless scripting (no MCP)	Lowest (~30–50 tokens output summary)	Batch scraping, pre-written flows	No interactive steering; Claude sees only text result, not live feedback
browser-use library	Screenshot + element refs hybrid	Medium (~800 tokens/action)	Balance: visual + structured	Requires external setup; not native Anthropic tool
Selenium / WebDriver	Scripted automation, no LLM in loop	$0 (but no intelligence)	Highly repetitive tasks	No adaptive behavior; breaks on UI change
Token-Cheapest Path for Rental Scraping:

Use Playwright MCP if sites are form-based (price range, dates, locations)
Fall back to Computer Use only for CAPTCHAs or unusual overlays
Script-first: write Playwright scripts → have Claude refine them, not drive them live
Sources: Playwright vs CLI Efficiency | browser-use Docs | Agent Browser Architecture

5. Determinism & Reliability Levers
Page Load & Stability:

Computer Use: No built-in wait logic; Claude must infer readiness from screenshots. Common failure: clicking before JS renders
Playwright: Built-in wait_for_load_state('networkidle'), element waiters; orders of magnitude more reliable
Mitigation: Add explicit 2–3s delay before each action, or use Playwright's condition-based waits
Reproducibility:

Selectors via CSS/XPath (Playwright) survive layout changes; pixel coords (Computer Use) break
Store element selectors in per-site config files; reuse across runs → amortize discovery cost
Screenshot coordinate drift on macOS Retina: divide Claude's coords by 2 (device_pixel_ratio = 2)
Cookie & Session Handling:

Computer Use: Screenshots show page state but no access to cookies/auth state; risk of re-login loops
Playwright: Automatic cookie jar; can persist sessions across runs via storageState
For rentals: Save auth/search state to disk after first run; inject on second session
Pop-ups & Dialogs:

Computer Use: Vision can spot overlays but must explicitly dismiss them (adds screenshot per popup)
Playwright: Can detect and close via page.on('dialog') event; no screenshot tax
Cookie banners: Pre-script with Playwright; only use Computer Use for unexpected overlays
Sources: Computer Use Best Practices | Playwright Waits & Reliability | Session Persistence Guide

Key Unknowns / Unverified
Exact token cost per Playwright action in current MCP server (sources cite 114K vs 27K but context unclear)
Native multi-tab support timeline for Computer Use (feature requests open; no ETA)
Caching behavior for repeated screenshots of same page state (none observed in public docs)
TL;DR for Car-Rental Skill:
Use Playwright MCP as primary driver (5–8x cheaper), Computer Use only for visual outliers (CAPTCHA, banner overlays). Pre-script site-specific flows; let Claude refine them rather than discover them. Sequential harvest (one site at a time) unless you provision separate browser instances. Token cost per site: ~3K–5K for Playwright-driven multi-step navigation vs 15K–20K for vision-heavy Computer Use.

RESEARCH TRACK 2
I'm building a browser-automation Skill that harvests lowest-tier, full-week price quotes from major US national car-rental company websites. I need a concise catalog of how each brand's booking website behaves, so I can design a pipeline that handles their idiosyncrasies gracefully. Do focused web research (WebSearch/WebFetch) and return a STRUCTURED, CONCISE summary. Current date: June 2026.

The brands (grouped by parent company — note the corporate families):
- Enterprise Holdings: Enterprise, Alamo, National
- Avis Budget Group: Avis, Budget, Payless
- Hertz Global: Hertz, Dollar, Thrifty
- Independents: Ace, Fox, Rent-a-Wreck

For each brand (or note where a parent shares one booking platform across its sub-brands), try to determine:

1. **Location entry method**: Does the booking funnel start from a ZIP code / "use my location" that populates a dropdown of nearby branches, OR can you directly type an address / branch name? Which is more reliable for automation?
2. **Lowest car tier label**: What does the cheapest class get called (e.g. "Economy", "Mini", "Value")? Note that labels differ and are non-intuitive.
3. **Price display quirks**: Does the funnel show an all-in total (taxes+fees) early, or only base rate until late/after reservation? (Known example: Enterprise shows total price only at the end, defaulting earlier to per-day×days.)
4. **Funnel friction**: Cookie/popup interstitials, mandatory login/account, extra add-on/insurance upsell pages, captchas/bot-detection, or anything that blocks an automated weekly-quote lookup.
5. **Shared platforms**: Confirm whether sub-brands of the same parent run on the same underlying reservation engine (so one automation flow could cover 3 brands), or are visually distinct but functionally identical.

Also answer one synthesis question: **Is there public evidence that any of these brands are CONSISTENTLY more expensive for identical terms** (so they could potentially be deprioritized in a low-cost search)? General reputation is fine but label it as such.

Return a per-brand-family table or bulleted breakdown, then a short "automation implications" section. Keep under ~700 words. Clearly flag anything you're inferring vs. verified.


Browsed the web
Now I have enough data. Let me compile the structured summary:

CAR RENTAL BOOKING PLATFORM CATALOG
ENTERPRISE HOLDINGS (Enterprise, Alamo, National)
Aspect	Findings
Shared Platform	VERIFIED: Single unified booking & fleet system across all three brands. Loyalty points (Emerald Club) transfer across brands. Same backend technology for features like express return kiosks.
Location Entry	ZIP/airport code → branch dropdown (most reliable for automation). Direct address entry also supported but less consistent.
Lowest Car Class	Economy or Compact (terminology varies by brand; typically 2-door hatchback).
Price Display	Base rate shown first; total price (taxes+fees) appears late in funnel, often only at checkout/confirmation. Major friction point.
Funnel Friction	Cookie consent popups standard. No mandatory pre-search login reported. GDS integration (Expedia, Booking.com) offers alternative entry point.
AVIS BUDGET GROUP (Avis, Budget, Payless)
Aspect	Findings
Shared Platform	LIKELY SEPARATE ENGINES: Payless acquired 2013. Search results confirm separate brand booking interfaces (e.g., Budget FastBreak loyalty uses distinct login). No evidence of unified 2026 consolidation despite parent company technology investments.
Location Entry	ZIP/city entry; dropdown selection standard across all three brands.
Lowest Car Class	Economy (Budget emphasizes value positioning; Payless uses similar labeling).
Price Display	Budget shows total price (taxes+fees) more transparently than competitors per NerdWallet. Base + itemized fees visible before checkout.
Funnel Friction	Cookie consent standard. Login not required for price search. Budget's approach: fewer hidden surprises = lower automation friction.
Price Competitiveness	Budget is CONSISTENTLY CHEAPER vs. Hertz, Avis, and Thrifty (verified via multiple sources: Cheapism, NerdWallet, Spacer). Strong candidate for low-cost aggregator.
HERTZ GLOBAL (Hertz, Dollar, Thrifty)
Aspect	Findings
Shared Platform	SEPARATE ENGINES: Each brand maintains distinct reservation systems, rate structures, and pricing logic. Deliberately preserved competitive separation despite shared physical locations (e.g., DFW) and backend fleet management.
Location Entry	ZIP/airport code standard; brand-specific dropdown behavior. Thrifty & Dollar often co-located with Hertz but front-end booking isolated.
Lowest Car Class	Varies: Economy (Hertz) vs. Compact (Dollar/Thrifty). Non-standardized across sub-brands = automation hazard.
Price Display	Consistent with industry: base + late fees model. No transparency advantage over Enterprise.
Funnel Friction	Cookie/consent popups. Hertz cookie policy explicitly documented (sa.hertz.com/rentacar/manage-cookies). No unusual bot-detection reported.
Price Competitiveness	CONSISTENTLY MORE EXPENSIVE than Budget, Enterprise, or Avis. Multiple sources confirm Hertz is the "premium-priced" tier. Deprioritize for lowest-cost automation.
INDEPENDENTS (Ace, Fox, Rent-a-Wreck)
Aspect	Findings
Platform Architecture	Ace (acerentacar.com, Indianapolis-based, ~200 locations) and Fox (owned by Drivo/Ace umbrella) share operational structure. Rent-a-Wreck (rentawreck.com) operates independently. INFERENCE: Likely individual booking engines; no unified platform evidence.
Location Entry	Limited search data; Ace suggests traditional ZIP/branch lookup. Rent-a-Wreck same. No automation-specific documentation found.
Lowest Car Class	Not explicitly researched for independents, but typically offer older/previously-rented stock → possible "Budget" or "Economy+" class.
Price Display	No specific findings; likely follows industry norm (base + late-stage fees).
Funnel Friction	No major friction patterns documented. Smaller player advantage: simpler, fewer pop-ups/tracking.
Market Position	VERY LIMITED COVERAGE: 200 (Ace) + ~50 (Fox) + ~100 (Rent-a-Wreck) locations total ≈ 5% of US market. Marginal ROI for automation vs. "big 3" family groups.
AUTOMATION IMPLICATIONS
Platform Consolidation:

One automation flow covers 3 brands: Enterprise Holdings (Enterprise, Alamo, National) — HIGH PRIORITY.
Separate flows required: Hertz, Dollar, Thrifty each need distinct location/class/price selectors.
Avis/Budget/Payless: Assumed separate engines; Budget's transparent pricing reduces parsing friction.
Class Label Harmonization:

Industry standard: Mini → Economy → Compact → Intermediate → Standard.
Hertz ecosystem inconsistency (Economy vs. Compact for "cheapest") requires fallback logic or hard-coded mapping per brand.
Price-Display Strategy:

Expect base rate early, fees/taxes only at checkout across ALL brands.
Exception: Budget shows total earlier. Cache this delta; reparse if Avis/Payless deviate.
Implement cost capture post-confirmation or crawl the final checkout page, not the search results page.
Lowest-Cost Sourcing:

Budget (Avis Budget Group) is verifiably the cheapest tier. Prioritize Budget in aggregator logic to surface the lowest weekly quotes first.
Hertz is the most expensive; deprioritize unless customer explicitly requests.
Enterprise/Alamo/National tier between Budget and Hertz.
Friction Ranking (Low→High):

Budget, Enterprise (simple flows, transparent / unified)
Avis, Alamo, National (standard friction)
Thrifty, Dollar (separate engines, class inconsistency)
Hertz (expensive, highest friction)
Independents (coverage too thin to warrant automation investment)
Suggested Automation Order:

Enterprise Holdings (3 brands, 1 engine)
Budget (cheapest, transparency)
Avis (if Payless share engine; else defer)
Hertz (last, for completeness; low-cost search will rarely default here)
Flagged as Inferred (not verified by primary source):

Avis/Budget/Payless platform sharing status — separate engines likely but unconfirmed.
Ace/Fox/Rent-a-Wreck booking architecture — assumed independent; no documentation found.
Verified from Primary Sources:

Enterprise Holdings: unified system (cross-brand Emerald Club, express return)
Hertz/Dollar/Thrifty: separate reservation engines (explicitly stated in 2023 Skift article on Hertz brand revamp)
Budget pricing rank: cheapest across all major sources (Cheapism, NerdWallet, Spacer)
Hertz pricing rank: most expensive consistently reported
Sources
Enterprise Holdings Wikipedia
National Car Rental Wikipedia
Alamo Car Rental About
Avis Budget Group Wikipedia
Avis Budget Group acquires Payless Car Rental System
Hertz and Aeroméxico partnership announcement
Thrifty Car Rental Wikipedia
NerdWallet: Cheapest Car Rental Company
Cheapism: Hertz vs. Enterprise vs. Budget vs. Thrifty
Hertz is Revamping Dollar and Thrifty Brands (Skift 2023)
ACE Rent a Car Wikipedia
Rent-a-Wreck Wikipedia
ACRISS codes explained
What is an economy car in car rental
Beware of hidden car rental fees
Enterprise New York City Car Rental




RESEARCH TRACK 3: Where should results live:?
Where should each new sweep's output file land? The existing archived-sweeps.md (on GitHub's develop branch) already holds dated sweep entries that something downstream may read