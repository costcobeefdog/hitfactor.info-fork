/* eslint-disable no-console */

import { loadJSON } from "@api/utils";

import { connect } from "../../api/src/db";
import { MatchScores } from "../../api/src/db/matchScores";
import { Scores } from "../../api/src/db/scores";
import { Shooters } from "../../api/src/db/shooters";

const selectMemberNumberFields = elos =>
  elos
    .map(c => ({
      memberNumber: c.memberNumber,
      knownMemberNumbers: c.knownMemberNumbers.filter(known => known !== c.memberNumber),
    }))
    .filter(c => !!c.knownMemberNumbers.length);

const co = selectMemberNumberFields(loadJSON("../../data/elo/co.json"));
const lo = selectMemberNumberFields(loadJSON("../../data/elo/lo.json"));
const ltd = selectMemberNumberFields(loadJSON("../../data/elo/ltd.json"));
const opn = selectMemberNumberFields(loadJSON("../../data/elo/open.json"));
const pcc = selectMemberNumberFields(loadJSON("../../data/elo/pcc.json"));
const prod = selectMemberNumberFields(loadJSON("../../data/elo/prod.json"));
const ss = selectMemberNumberFields(loadJSON("../../data/elo/ss.json"));
const revo = selectMemberNumberFields(loadJSON("../../data/elo/co.json"));

interface ELOKnown {
  memberNumber: string;
  knownMemberNumbers: string[];
}

const renameScoresAndShooters = async (shooterRenameMap: Record<string, string>) => {
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
              originalMemberNumber: oldMemberNumber,
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
};

/**
 * Migrates shooters & scores using knownMemberNumbers from Jay Slater's ELO export.
 *
 * Updates Scores collection (modifying memberNumber & memberNumberDivision)
 * Deletes from Shooters collection.
 */
const fixUp = async () => {
  await connect();

  const shooterRenameMap = ([] as ELOKnown[])
    .concat(ss, revo, prod, ltd, pcc, opn, lo, co)
    .reduce((acc, cur) => {
      cur.knownMemberNumbers.forEach(known => {
        acc[known] = cur.memberNumber;
      });
      return acc;
    }, {});

  // rename scores
  await renameScoresAndShooters(shooterRenameMap);
  process.exit(0);
};

fixUp();
