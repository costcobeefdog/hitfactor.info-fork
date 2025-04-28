/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import { connect } from "../../api/src/db";
import {
  MatchBumps,
  matchBumpsForMatchResults,
  saveMatchBumps,
} from "../../api/src/db/matchBumps";
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
  const matchUUID = process.argv[2];
  if (!matchUUID) {
    console.error("must provide match uuid");
    process.exit(1);
  }

  await connect();
  await recalculateBumpForMatch(matchUUID);
  process.exit(0);
};

rebump();
