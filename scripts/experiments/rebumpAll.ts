/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import { connect } from "../../api/src/db";
import {
  MatchBumps,
  matchBumpsForMatchResults,
  saveMatchBumps,
} from "../../api/src/db/matchBumps";
import { Matches } from "../../api/src/db/matches";
import {
  backfillClassifications,
  MatchScores,
  saveMatchScores,
} from "../../api/src/db/matchScores";

const recalculateBumpForMatch = async (uuid: string) => {
  const scores = await MatchScores.find({ upload: uuid }).limit(0).lean();
  const backfilled = await backfillClassifications(scores);
  await saveMatchScores(backfilled);
  const bumps = matchBumpsForMatchResults(backfilled);
  await saveMatchBumps(bumps);
};

const rebump = async () => {
  await connect();

  const maybeEligibleMatches = await MatchBumps.find({
    filteredDataPoints: { $gte: 30 },
    filteredCorrelation: { $gte: 0.8 },
    $or: [{ filteredMasters: { $gte: 5 } }, { filteredGrandmasters: { $gte: 3 } }],
  })
    .limit(0)
    .lean();

  const uuids = uniqBy(
    maybeEligibleMatches.map(c => c.upload),
    c => c,
  );
  console.log(`${uuids.length} possibly eligible matches`);

  const matches = await Matches.find({ uuid: { $in: uuids } }).limit(0);
  console.log(
    JSON.stringify(
      matches.map(m => m.name),
      null,
      2,
    ),
  );

  let i = 0;
  for (const uuid of uuids) {
    console.log(`processing ${++i}/${uuids.length}`);
    await recalculateBumpForMatch(uuid);
  }
  process.exit(0);
};

rebump();
