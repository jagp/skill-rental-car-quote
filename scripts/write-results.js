#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUTPUT_DIR = path.join(__dirname, "..", "data", "sweeps");

/**
 * Writes one rental-radar-sweep record as a single JSON file.
 * One call = one file, regardless of how many target pickup dates or
 * companies are present in `observations`.
 *
 * @param {object} args
 * @param {string} [args.sweepDate] - YYYY-MM-DD the sweep was run; defaults to today.
 * @param {object} [args.meta] - operational metadata (searchCount, durationMin, method, notes, errors, tokensBurned, kind, source).
 * @param {object} [args.searchParameters] - nominal search criteria for the run (pickupDate, returnDate, location, carClass, time).
 * @param {object[]} args.observations - one entry per (company, branch, target date) checked.
 * @returns {string} the absolute path written.
 */
function writeResults({
  sweepDate,
  meta = {},
  searchParameters = {},
  observations,
}) {
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new Error("observations must be a non-empty array");
  }

  const resolvedSweepDate = sweepDate || new Date().toISOString().slice(0, 10);
  const record = {
    type: "rental-radar-sweep",
    sweepDate: resolvedSweepDate,
    meta,
    searchParameters,
    observations,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const suffix = crypto.randomUUID().slice(0, 4);
  const filePath = path.join(
    OUTPUT_DIR,
    `sweep-${resolvedSweepDate}-${suffix}.json`,
  );

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2) + "\n");

  return filePath;
}

module.exports = { writeResults, OUTPUT_DIR };

if (require.main === module) {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  const filePath = writeResults(input);
  console.log(filePath);
}
