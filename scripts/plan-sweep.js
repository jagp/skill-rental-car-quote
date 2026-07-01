#!/usr/bin/env node
"use strict";

/**
 * plan-sweep.js — the deterministic sweep planner.
 *
 * Pure, browser-free. Turns config + a fluid "token budget" + a base
 * reservation date into the ordered batch plan the skill executes: which
 * (brand, branch, pickupDate, returnDate) tuples to search, in what order.
 *
 * The split of responsibility for the whole skill is: PLANNING is algorithmic
 * (here), NAVIGATION is natural-language (SKILL.md + references/). Everything
 * in this file is deterministic given its inputs so it is cheap and testable.
 */

const fs = require("fs");
const path = require("path");

const CONFIG_DIR = path.join(__dirname, "..", "config");

// --- Tunable model constants -------------------------------------------------

// Gas-breakeven: the hard outer distance past which a cheaper branch can never
// pay for itself. Derived from the nationwide ~$20/day price floor: even if the
// distant rental were FREE, the round-trip gas to reach it must cost less than a
// full local rental at the floor. d < (weeklyFloor * mpg) / (2 * gasPrice).
const GAS_MODEL = {
  weeklyFloorUsd: 20 * 7, // $20/day floor over the default 7-day term
  mpg: 30,
  gasPriceUsd: 3.5,
};

// Token-budget → search granularity. The budget is a fluid scalar (not an enum);
// these bases scale it into a branch count and a day fan-out. Clamped to sane
// limits so an absurd budget can't generate a runaway plan.
const BUDGET = {
  min: 0.1,
  max: 10,
  branchesPerUnit: 2, // branches polled per company ≈ budget * this
  maxBranchesPerCompany: 8,
  datesPerUnit: 3, // distinct pickup dates ≈ budget * this
  maxPickupDates: 9,
  fanStepDays: 3, // spacing between fanned pickup dates (mirrors observed +0/+3/+6)
};

const DEFAULT_RENTAL_LENGTH_DAYS = 7;
const DEFAULT_PICKUP_TIME = "10:00";
const DEFAULT_CAR_CLASS = "economy";

// --- Date helpers (UTC, no external deps) ------------------------------------

function parseDate(s) {
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`invalid date: ${s}`);
  return d;
}

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(s, n) {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

// --- Derived planning quantities ---------------------------------------------

/** Hard maximum branch distance (miles) from the gas-breakeven model. */
function gasBreakevenMaxMiles(model = GAS_MODEL) {
  return (model.weeklyFloorUsd * model.mpg) / (2 * model.gasPriceUsd);
}

/** How many nearby branches to poll per company at this token budget. */
function branchesPerCompany(tokenBudget) {
  return clamp(
    Math.round(tokenBudget * BUDGET.branchesPerUnit),
    1,
    BUDGET.maxBranchesPerCompany,
  );
}

/**
 * Pickup dates fanned symmetrically around the base reservation date, spaced
 * `fanStepDays` apart, never earlier than `today`. Count scales with budget.
 */
function pickupDates(reservationDate, tokenBudget, today) {
  const count = clamp(
    Math.round(tokenBudget * BUDGET.datesPerUnit),
    1,
    BUDGET.maxPickupDates,
  );
  const half = Math.floor(count / 2);
  const out = [];
  for (let i = -half; out.length < count; i++) {
    const date = addDays(reservationDate, i * BUDGET.fanStepDays);
    if (daysBetween(today, date) >= 0) out.push(date);
    // Safety: once we've walked far enough forward, stop.
    if (i > half + count) break;
  }
  return out;
}

/** True when a brand's tier label is stale or has never been verified. */
function tierNeedsVerification(tier, today, stalenessDays) {
  if (!tier || !tier.lastVerified) return true;
  return daysBetween(tier.lastVerified, today) > stalenessDays;
}

// --- The planner -------------------------------------------------------------

/**
 * Build the batch plan.
 *
 * @param {object} args
 * @param {object} args.companies   - parsed config/companies.json
 * @param {object} args.branches    - parsed config/branches.json
 * @param {object} args.carTiers    - parsed config/car-tiers.json
 * @param {string} args.reservationDate - base target pickup date (YYYY-MM-DD)
 * @param {number} [args.tokenBudget=1] - fluid scalar; higher = wider/costlier
 * @param {number} [args.rentalLengthDays=7] - term length; only the default is used elsewhere
 * @param {string} [args.today] - YYYY-MM-DD; defaults to system today (for staleness + fan clamping)
 * @returns {object} batch plan consumed by the skill
 */
function planSweep({
  companies,
  branches,
  carTiers,
  reservationDate,
  tokenBudget = 1,
  rentalLengthDays = DEFAULT_RENTAL_LENGTH_DAYS,
  today,
}) {
  if (!reservationDate) throw new Error("reservationDate is required");
  const resolvedToday = today || new Date().toISOString().slice(0, 10);
  const budget = clamp(tokenBudget, BUDGET.min, BUDGET.max);

  const maxMiles = gasBreakevenMaxMiles();
  const perCompany = branchesPerCompany(budget);
  const dates = pickupDates(reservationDate, budget, resolvedToday);
  const stalenessDays = (carTiers && carTiers.stalenessDays) || 365;

  const targets = dates.map((pickupDate) => ({
    pickupDate,
    returnDate: addDays(pickupDate, rentalLengthDays),
  }));

  const branchesByBrand = {};
  for (const b of branches.branches) {
    (branchesByBrand[b.brand] = branchesByBrand[b.brand] || []).push(b);
  }

  const staleTiers = [];
  const plannedCompanies = [];

  const ordered = [...companies.brands].sort((a, b) => a.priority - b.priority);
  for (const company of ordered) {
    // Token-budget gate for thin-coverage independents.
    if ((company.minTokenBudget || 0) > budget) continue;

    const candidates = (branchesByBrand[company.brand] || [])
      .filter((b) => b.distanceMiles <= maxMiles)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, perCompany);

    if (candidates.length === 0) continue; // no in-range branch known for this brand

    const tier = (carTiers && carTiers.tiers && carTiers.tiers[company.brand]) || null;
    const verificationNeeded = tierNeedsVerification(tier, resolvedToday, stalenessDays);
    if (verificationNeeded) staleTiers.push(company.brand);

    plannedCompanies.push({
      brand: company.brand,
      parent: company.parent,
      reservationUrl: company.reservationUrl,
      priority: company.priority,
      tier: {
        label: tier ? tier.label : null,
        acriss: tier ? tier.acriss : null,
        verificationNeeded,
      },
      branches: candidates.map((b) => ({
        branchId: b.branchId,
        name: b.name,
        zip: b.zip,
        distanceMiles: b.distanceMiles,
      })),
      targets,
    });
  }

  const searchCount = plannedCompanies.reduce(
    (n, c) => n + c.branches.length * targets.length,
    0,
  );

  return {
    type: "rental-radar-sweep-plan",
    generatedAt: new Date().toISOString(),
    sweepDate: resolvedToday,
    reservationDate,
    rentalLengthDays,
    tokenBudget: budget,
    derived: {
      branchesPerCompany: perCompany,
      pickupDates: dates,
      gasBreakevenMaxMiles: Math.round(maxMiles),
      searchCount,
    },
    staleTiers,
    searchDefaults: {
      pickupTime: DEFAULT_PICKUP_TIME,
      carClass: DEFAULT_CAR_CLASS,
    },
    companies: plannedCompanies,
  };
}

// --- Config loading + CLI ----------------------------------------------------

function loadConfig() {
  const read = (f) => JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, f), "utf8"));
  return {
    companies: read("companies.json"),
    branches: read("branches.json"),
    carTiers: read("car-tiers.json"),
  };
}

module.exports = {
  planSweep,
  gasBreakevenMaxMiles,
  branchesPerCompany,
  pickupDates,
  tierNeedsVerification,
  loadConfig,
  BUDGET,
  GAS_MODEL,
};

if (require.main === module) {
  // Usage: node scripts/plan-sweep.js <reservationDate> [tokenBudget] [rentalLengthDays]
  const [reservationDate, tokenBudget, rentalLengthDays] = process.argv.slice(2);
  if (!reservationDate) {
    console.error(
      "usage: node scripts/plan-sweep.js <reservationDate YYYY-MM-DD> [tokenBudget] [rentalLengthDays]",
    );
    process.exit(1);
  }
  const cfg = loadConfig();
  const plan = planSweep({
    ...cfg,
    reservationDate,
    tokenBudget: tokenBudget ? Number(tokenBudget) : 1,
    rentalLengthDays: rentalLengthDays ? Number(rentalLengthDays) : undefined,
  });
  console.log(JSON.stringify(plan, null, 2));
}
