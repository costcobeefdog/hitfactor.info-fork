/* eslint-disable no-console */

import { uspsaClassifiers2025 } from "@shared/constants/classifiers";

import {
  classifierToId,
  deprecatedUSPSAClassifiers,
} from "../../api/src/dataUtil/classifiersData";
import { Classifiers, ClassifierWithVirtuals } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";
import { divShortToId, uspsaDivShortNames } from "../../shared/constants/divisions";

const classifiersForDivision = async (division: string) =>
  (
    await Classifiers.find({
      division,
      classifier: { $nin: deprecatedUSPSAClassifiers },
    })
      .populate("recHHFs")
      .lean<ClassifierWithVirtuals[]>({ virtuals: true })
  ).toSorted(
    (a, b) =>
      uspsaClassifiers2025.indexOf(a.classifier) -
      uspsaClassifiers2025.indexOf(b.classifier),
  );

interface FlatHHF {
  classifier_id: string;
  division_id: string;
  hhf: number;
}
const go = async () => {
  await connect();

  const all = [] as FlatHHF[];
  for (const division of uspsaDivShortNames) {
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
