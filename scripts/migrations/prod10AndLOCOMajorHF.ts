/* eslint-disable no-console */
import { uspsaClassifiers2025 } from "@shared/constants/classifiers";
import { PROD_15_EFFECTIVE_TS } from "@shared/constants/divisions";
import { majorHF } from "@shared/utils/hitfactor";

import { connect } from "../../api/src/db";
import { Scores } from "../../api/src/db/scores";

const go = async () => {
  await connect();

  const prodScores = (
    await Scores.find({
      division: "prod",
      classifier: { $in: uspsaClassifiers2025 },
      sd: { $lte: new Date(PROD_15_EFFECTIVE_TS) },
    }).lean()
  ).filter(c => c.hf > 0);

  const locoScores = (
    await Scores.find({
      division: { $in: ["lo", "co"] },
      classifier: { $in: uspsaClassifiers2025 },
    }).lean()
  ).filter(c => c.hf > 0);

  const scores = prodScores.concat(locoScores);

  console.log(`total prod10+loco scores: ${scores.length}`);

  const scoresWithMajorHF = scores
    .map(c => {
      c.majorHF = majorHF(c);
      return c;
    })
    .filter(c => (c.majorHF ?? 0) > 0);

  const total = scoresWithMajorHF.length;
  console.log(`with majorHF: ${total}`);

  let count = 0;
  while (scoresWithMajorHF.length) {
    const curBatch = scoresWithMajorHF.splice(0, 100);
    count += curBatch.length;

    await Scores.bulkWrite(
      curBatch.map(s => ({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { majorHF: s.majorHF } },
        },
      })),
    );
    console.log(`${count}/${total}`);
  }

  process.exit(0);
};

go();
