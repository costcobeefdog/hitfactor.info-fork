/* eslint-disable no-console */

import { connect } from "../../api/src/db";
import { Scores } from "../../api/src/db/scores";

/**
 * Migrates single fucked up classifier name to proper one
 */
const go = async () => {
  const from = "“25-06 They All Count”";
  const to = "25-06";
  if (!from || !to) {
    console.error("must provide from and to");
    process.exit(1);
  }
  console.log(`Will rename ${from} to ${to}`);

  await connect();

  // rename scores in batch
  const classifierRenameMap = { [from]: to };
  const oldClassifiersToProcess = Object.keys(classifierRenameMap);
  console.log(`renames = ${oldClassifiersToProcess.length}`);
  while (oldClassifiersToProcess.length) {
    const curBatch = oldClassifiersToProcess.splice(0, 20);
    console.log(`renaming, ${oldClassifiersToProcess.length} numbers left`);

    const scoreUpdateMany = curBatch.map(oldClassifier => ({
      updateMany: {
        filter: {
          classifier: oldClassifier,
        },
        update: [
          {
            $set: {
              classifier: classifierRenameMap[oldClassifier],
              classifierDivision: {
                $concat: [classifierRenameMap[oldClassifier], ":", "$division"],
              },
            },
          },
        ],
      },
    }));
    const resultScores = await Scores.bulkWrite(scoreUpdateMany);

    console.log(JSON.stringify(resultScores, null, 2));
  }
  console.log("scores renaming complete");
  console.log("complete! Now rehydrate if needed");
  process.exit(0);
};

go();
