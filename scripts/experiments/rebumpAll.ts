/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import {
  connect,
  MatchBumps,
  matchBumpsForMatchResults,
  saveMatchBumps,
  backfillComboClassifications,
  MatchScores,
  saveMatchScores,
} from "@api/db";
import { matchBumpThresholds } from "@shared/constants/difficulty";

const recalculateBumpForMatch = async (uuid: string) => {
  const scores = await MatchScores.find({ upload: uuid }).limit(0).lean();
  const backfilled = await backfillComboClassifications(scores);
  await saveMatchScores(backfilled);
  const bumps = matchBumpsForMatchResults(backfilled);
  await saveMatchBumps(bumps);
};

/**
 * Recalculates MatchScores and MatchBumps for all potentially eligible matches.
 * Uses >= 40 datapoints filter on MatchBumps only.
 *
 * DOES NOT SAVE SHOOTER'S CLASSIFICATION.
 */
const rebumpAll = async () => {
  await connect();

  const maybeEligibleMatches = await MatchBumps.find({
    dataPoints: { $gte: matchBumpThresholds.filteredDataPoints },
  })
    .sort({ date: 1 })
    .limit(0)
    .select(["upload", "division"])
    .lean();

  const uuids = uniqBy(
    maybeEligibleMatches.map(c => c.upload),
    c => c,
  );
  console.log(`${uuids.length} possibly eligible matches`);

  let i = 0;
  for (const uuid of uuids) {
    console.log(`processing ${uuid} ${++i}/${uuids.length}`);
    await recalculateBumpForMatch(uuid);
  }
  console.log("done, now reclassify all shooters");
  process.exit(0);
};

export const rebumpOne = async () => {
  await connect();

  console.log("bumping");

  await recalculateBumpForMatch("a36f1dc5-7954-4fc5-9488-0c81d37e8c1d");

  console.log("done");
  process.exit(0);
};

rebumpAll();
//rebumpOne();
