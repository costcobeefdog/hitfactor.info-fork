/* eslint-disable no-console */
import terrenceHHFs from "@shared/constants/terrenceHHF";

import { deprecatedUSPSAClassifiers } from "../../api/src/dataUtil/classifiersData";
import { Classifiers } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";

const classifiersForDivision = async (division: string) =>
  Classifiers.find({
    division,
    classifier: { $nin: deprecatedUSPSAClassifiers },
  }).populate("recHHFs");

const go = async () => {
  await connect();

  const division = "l10";
  console.log("");
  console.log(`<${division}>`);
  const classifiers = await classifiersForDivision(division);
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
                ? "Terrence"
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
