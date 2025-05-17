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
 * Uses >= 30 datapoints filter on MatchBumps only.
 *
 * DOES NOT SAVE SHOOTER'S CLASSIFICATION.
 */
const rebumpAll = async () => {
  await connect();

  const maybeEligibleMatches = await MatchBumps.find({
    dataPoints: { $gte: matchBumpThresholds.filteredDataPointsMaybe },
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
  process.exit(0);
};

rebumpAll();
