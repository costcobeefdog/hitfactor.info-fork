/* eslint-disable no-console */
import { uspsaClassifiers2025 } from "@shared/constants/classifiers";
import terrenceHHFs from "@shared/constants/terrenceHHF";

import { Classifiers, ClassifierWithVirtuals } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";

const classifiersForDivision = async (division: string) =>
  Classifiers.find({
    division,
    classifier: { $in: uspsaClassifiers2025 },
  })
    .populate("recHHFs")
    .lean<ClassifierWithVirtuals[]>({ virtuals: true });

const go = async () => {
  await connect();

  const division = "l10";
  console.log("");
  console.log(`<${division}>`);
  const classifiers = (await classifiersForDivision(division)).toSorted(
    (a, b) =>
      uspsaClassifiers2025.indexOf(a.classifier) -
      uspsaClassifiers2025.indexOf(b.classifier),
  );
  classifiers.forEach(
    ({ classifier, name, recHHFs: { recHHF, opnHHF, locoMajorHHF, prod10MajorHHF } }) => {
      const method =
        recHHF === locoMajorHHF
          ? "LOCO Major"
          : recHHF === prod10MajorHHF
            ? "Prod10 Major"
            : recHHF === opnHHF
              ? "Open"
              : recHHF === terrenceHHFs[classifier]
                ? "L/LO/Open Regression"
                : "SS";
      console.log(
        `    ${classifier} ${name.replace("#", "\\#").replace("&", "\\&")} & ${recHHF.toFixed(4)} & ${opnHHF?.toFixed(4)} & ${method} \\\\`,
      );
      console.log("    \\hline");
    },
  );
  console.log(`</${division}>`);

  console.error("\ndone");
  process.exit(0);
};

go();
