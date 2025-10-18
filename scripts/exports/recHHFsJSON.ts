/* eslint-disable no-console */

import { deprecatedUSPSAClassifiers } from "../../api/src/dataUtil/classifiersData";
import { Classifiers } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";
import { uspsaDivShortNames } from "../../shared/constants/divisions";

const classifiersForDivision = async (division: string) =>
  Classifiers.find({
    division,
    //classifier: { $nin: deprecatedUSPSAClassifiers },
    classifier: /25-/,
  })
    .sort({ classifier: 1 })
    .populate("recHHFs");

const go = async () => {
  await connect();

  const allDivs = {};
  for (const division of uspsaDivShortNames) {
    if (division === "l10") {
      //continue;
    }
    allDivs[division] = {};
    const classifiers = await classifiersForDivision(division);
    classifiers.forEach(({ classifier, recHHFs: { recHHF } }) => {
      allDivs[division][classifier] = Number(recHHF.toFixed(4));
    });
  }

  console.log(JSON.stringify(allDivs, null, 2));

  process.exit(0);
};

go();
