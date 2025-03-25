/* eslint-disable no-console */

import {
  classifierToId,
  deprecatedUSPSAClassifiers,
} from "../api/src/dataUtil/classifiersData";
import { Classifiers } from "../api/src/db/classifiers";
import { connect } from "../api/src/db/index";
import { divShortToId, uspsaDivShortNames } from "../shared/constants/divisions";

const classifiersForDivision = async (division: string) =>
  Classifiers.find({
    division,
    classifier: { $nin: deprecatedUSPSAClassifiers },
  }).populate("recHHFs");

interface FlatHHF {
  classifier_id: string;
  division_id: string;
  hhf: number;
}
const go = async () => {
  await connect();

  const all = [] as FlatHHF[];
  for (const division of uspsaDivShortNames) {
    if (division === "l10") {
      continue;
    }
    const classifiers = await classifiersForDivision(division);
    classifiers.forEach(({ classifier, recHHFs: { recHHF } }) => {
      all.push({
        classifier_id: classifierToId[classifier],
        division_id: divShortToId[division],
        hhf: Number(recHHF.toFixed(4)),
      });
    });
  }

  console.log(JSON.stringify(all, null, 2));

  process.exit(0);
};

go();
