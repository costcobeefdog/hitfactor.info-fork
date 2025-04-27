/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import {
  fetchAndSaveMoreMatchesSinceUpdatedDate,
  Matches,
} from "../../api/src/db/matches";

const dedupe = async () => {
  await connect();

  const missingMatches = await Matches.find({ templateName: { $exists: false } })
    .limit(0)
    .lean();
  console.log(`missing = ${missingMatches.length}`);

  const results = await fetchAndSaveMoreMatchesSinceUpdatedDate(new Date("2024-07-10"));
  console.log("db results: ");
  console.log(JSON.stringify(results, null, 2));

  const missingMatchesAfter = await Matches.find({ templateName: { $exists: false } })
    .limit(0)
    .lean();
  console.log(`missing after= ${missingMatchesAfter.length}`);

  process.exit(0);
};

dedupe();
