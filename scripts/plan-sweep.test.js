"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  planSweep,
  gasBreakevenMaxMiles,
  branchesPerCompany,
  pickupDates,
  tierNeedsVerification,
} = require("./plan-sweep");

// --- Fixtures ---------------------------------------------------------------

const companies = {
  brands: [
    { brand: "Budget", parent: "ABG", reservationUrl: "u", priority: 1, minTokenBudget: 0 },
    { brand: "Hertz", parent: "HG", reservationUrl: "u", priority: 9, minTokenBudget: 0 },
    { brand: "Enterprise", parent: "EH", reservationUrl: "u", priority: 2, minTokenBudget: 0 },
    { brand: "Ace", parent: "Independent", reservationUrl: "u", priority: 10, minTokenBudget: 2.5 },
  ],
};

const branches = {
  branches: [
    { brand: "Budget", branchId: "B1", name: "Near", zip: "1", distanceMiles: 2 },
    { brand: "Budget", branchId: "B2", name: "Mid", zip: "2", distanceMiles: 18 },
    { brand: "Budget", branchId: "B3", name: "FarTooFar", zip: "3", distanceMiles: 900 },
    { brand: "Enterprise", branchId: "E1", name: "Near", zip: "1", distanceMiles: 1.8 },
    { brand: "Hertz", branchId: "H1", name: "Near", zip: "1", distanceMiles: 9 },
    { brand: "Ace", branchId: "A1", name: "Near", zip: "1", distanceMiles: 5 },
  ],
};

const carTiers = {
  stalenessDays: 365,
  tiers: {
    Budget: { label: "Economy", acriss: "ECAR", lastVerified: "2026-06-01" },
    Enterprise: { label: "Economy", acriss: "ECAR", lastVerified: "2026-06-01" },
    Hertz: { label: "Economy", acriss: "ECAR", lastVerified: "2024-01-01" }, // stale
    Ace: { label: "Economy", acriss: "ECAR", lastVerified: "2026-06-01" },
  },
};

const TODAY = "2026-06-20";
const RES = "2026-07-06";

function plan(overrides = {}) {
  return planSweep({ companies, branches, carTiers, reservationDate: RES, today: TODAY, ...overrides });
}

// --- Unit: derived quantities ----------------------------------------------

test("gas-breakeven distance is deterministic ($140 floor, 30mpg, $3.50) = 600mi", () => {
  assert.equal(gasBreakevenMaxMiles(), 600);
});

test("branchesPerCompany scales with budget and clamps", () => {
  assert.equal(branchesPerCompany(1), 2);
  assert.equal(branchesPerCompany(3), 6);
  assert.equal(branchesPerCompany(100), 8); // maxBranchesPerCompany
  assert.equal(branchesPerCompany(0.1), 1); // floor of 1
});

test("pickupDates fan out around reservation, scale with budget, never before today", () => {
  // budget 1 => round(1*3)=3 dates spaced 3 days: -3 / 0 / +3
  assert.deepEqual(pickupDates(RES, 1, TODAY), ["2026-07-03", "2026-07-06", "2026-07-09"]);
  // higher budget => more dates
  assert.equal(pickupDates(RES, 2, TODAY).length, 6);
  // dates before `today` are dropped
  const near = pickupDates("2026-06-21", 1, TODAY); // -3 => 06-18 (<today) dropped
  assert.ok(!near.includes("2026-06-18"));
  assert.ok(near.includes("2026-06-21"));
});

test("tierNeedsVerification flags missing and >365-day-old labels", () => {
  assert.equal(tierNeedsVerification(null, TODAY, 365), true);
  assert.equal(tierNeedsVerification({ lastVerified: "2026-06-01" }, TODAY, 365), false);
  assert.equal(tierNeedsVerification({ lastVerified: "2024-01-01" }, TODAY, 365), true);
});

// --- Integration: planSweep -------------------------------------------------

test("companies are ordered by priority (Budget first, Hertz last)", () => {
  const order = plan({ tokenBudget: 1 }).companies.map((c) => c.brand);
  assert.deepEqual(order, ["Budget", "Enterprise", "Hertz"]); // Ace gated out at budget 1
});

test("independents are gated out below their minTokenBudget", () => {
  assert.ok(!plan({ tokenBudget: 1 }).companies.some((c) => c.brand === "Ace"));
  assert.ok(plan({ tokenBudget: 3 }).companies.some((c) => c.brand === "Ace"));
});

test("branches beyond the gas-breakeven distance are excluded", () => {
  const budgetCo = plan({ tokenBudget: 5 }).companies.find((c) => c.brand === "Budget");
  const ids = budgetCo.branches.map((b) => b.branchId);
  assert.ok(ids.includes("B1") && ids.includes("B2"));
  assert.ok(!ids.includes("B3")); // 900mi > 600mi cap
});

test("branches are nearest-first and capped by token budget", () => {
  const budgetCo = plan({ tokenBudget: 1 }).companies.find((c) => c.brand === "Budget");
  assert.equal(budgetCo.branches.length, 2); // branchesPerCompany(1) = 2
  assert.deepEqual(budgetCo.branches.map((b) => b.branchId), ["B1", "B2"]); // sorted by distance
});

test("returnDate = pickupDate + rentalLengthDays (default 7, overridable)", () => {
  const delta = (t) => Math.round((new Date(t.returnDate) - new Date(t.pickupDate)) / 86400000);

  for (const t of plan({ tokenBudget: 1 }).companies[0].targets) {
    assert.equal(delta(t), 7); // default term
  }
  for (const t of plan({ tokenBudget: 1, rentalLengthDays: 10 }).companies[0].targets) {
    assert.equal(delta(t), 10); // overridden term
  }
});

test("stale tiers are flagged for re-verification", () => {
  const p = plan({ tokenBudget: 1 });
  assert.ok(p.staleTiers.includes("Hertz"));
  assert.ok(!p.staleTiers.includes("Budget"));
  const hertz = p.companies.find((c) => c.brand === "Hertz");
  assert.equal(hertz.tier.verificationNeeded, true);
});

test("token budget is clamped to sane limits", () => {
  assert.equal(plan({ tokenBudget: 9999 }).tokenBudget, 10);
  assert.equal(plan({ tokenBudget: 0 }).tokenBudget, 0.1);
});

test("searchCount = branches x targets summed across companies", () => {
  const p = plan({ tokenBudget: 1 });
  const expected = p.companies.reduce((n, c) => n + c.branches.length * c.targets.length, 0);
  assert.equal(p.derived.searchCount, expected);
});
