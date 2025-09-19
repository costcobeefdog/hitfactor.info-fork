/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { MatchScores } from "../../api/src/db/matchScores";
import { Scores } from "../../api/src/db/scores";
import { Shooters } from "../../api/src/db/shooters";

/**
 * Migrates single shooter's scores/matchScore/shooter docs
 */
const go = async () => {
  const from = (process.argv[2] ?? "").toUpperCase();
  const to = (process.argv[3] ?? "").toUpperCase();
  if (!from || !to) {
    console.error("must provide from and to memberNumbers");
    process.exit(1);
  }
  console.log(`Will rename ${from} to ${to}`);

  await connect();

  // rename scores in batch
  const shooterRenameMap = { [from]: to };
  const oldNumbersToProcess = Object.keys(shooterRenameMap);
  console.log(`renames = ${oldNumbersToProcess.length}`);
  while (oldNumbersToProcess.length) {
    const curBatch = oldNumbersToProcess.splice(0, 20);
    console.log(`renaming, ${oldNumbersToProcess.length} numbers left`);

    const scoreUpdateMany = curBatch.map(oldMemberNumber => ({
      updateMany: {
        filter: {
          memberNumber: oldMemberNumber,
        },
        update: [
          {
            $set: {
              memberNumber: shooterRenameMap[oldMemberNumber],
              memberNumberDivision: {
                $concat: [shooterRenameMap[oldMemberNumber], ":", "$division"],
              },
            },
          },
        ],
      },
    }));
    const resultScores = await Scores.bulkWrite(scoreUpdateMany);
    const resultMatchScores = await MatchScores.bulkWrite(scoreUpdateMany);

    console.log(JSON.stringify(resultScores, null, 2));
    console.log(JSON.stringify(resultMatchScores, null, 2));
  }
  console.log("scores renaming complete");

  // delete renamed shooters
  console.log("deleting oldNumber shooters");
  const resultDelete = await Shooters.deleteMany({
    memberNumber: { $in: Object.keys(shooterRenameMap) },
  });
  console.log("complete! Now rehydrate the new shooter (make sure it exits).");
  console.log(JSON.stringify(resultDelete, null, 2));
  process.exit(0);
};

go();
