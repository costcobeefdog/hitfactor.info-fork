/* eslint-disable no-console */

import uniqBy from "lodash.uniqby";

import { connect } from "../../api/src/db";
import { MatchScores } from "../../api/src/db/matchScores";
import { Scores } from "../../api/src/db/scores";
import { Shooters } from "../../api/src/db/shooters";

/**
 * Migrates shooters & scores with L memberNumbers to last memberNumber they had historically.
 * Using names to match L and non-L memberNumbers.
 *
 * Updates Scores collection (modifying memberNumber & memberNumberDivision)
 * Deletes from Shooters collection.
 */
const fixUp = async () => {
  await connect();

  const regexForPrefix = /^(L|A|TY|FY)/;
  const shooters = await Shooters.find({
    memberNumber: regexForPrefix,
    name: { $exists: true },
  })
    .select(["memberNumber", "name"])
    .limit(0);
  console.error(`total ${shooters.length}`);

  const shootersByTrimmedNames = shooters.reduce(
    (acc, cur) => {
      const name = cur.name.trim();
      if (!name) {
        return acc;
      }

      const curArray = (acc[name] ??= []);

      // skip invalid numbers
      if (!cur.memberNumber.match(/^[TYLFA]+\d+$/)) {
        return acc;
      }

      // skip sequential dupes (same number different divisions)
      if (curArray[curArray.length - 1] === cur.memberNumber) {
        return acc;
      }

      curArray.push(cur.memberNumber);
      return acc;
    },
    {} as Record<string, string[]>,
  );
  const renameCandidates = Object.fromEntries(
    Object.entries(shootersByTrimmedNames).filter(
      ([name, numbers]) =>
        !name.match(/private/gi) &&
        numbers.length > 1 && // has multiple numbers under same name
        uniqBy(numbers, n => n.replaceAll(/[a-zA-Z]/g, "")).length <= 2 && // no more than one L-number and same digits non-L numbers
        numbers.findIndex(number => number.startsWith("L")) >= 0, // contains L-number
    ),
  );

  const shooterRenameMap = Object.values(renameCandidates).reduce((acc, numbers) => {
    const lNumber = numbers.find(n => n.startsWith("L"));
    if (!lNumber) {
      return acc;
    }

    const otherNumbers = numbers.filter(cur => cur !== lNumber);
    otherNumbers.forEach(oldNumber => {
      acc[oldNumber] = lNumber;
    });
    return acc;
  }, {});

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
    await Scores.bulkWrite(scoreUpdateMany);
    await MatchScores.bulkWrite(scoreUpdateMany);
  }
  console.log("scores renaming complete");

  // delete renamed shooters
  console.log("deleting oldNumber shooters");
  const resultDelete = await Shooters.deleteMany({
    memberNumber: { $in: Object.keys(shooterRenameMap) },
  });
  console.log("complete! Now dedupe scores and rehydrate.");
  console.log(JSON.stringify(resultDelete, null, 2));
  process.exit(0);
};

fixUp();
