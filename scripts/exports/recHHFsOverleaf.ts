/* eslint-disable no-console */

import { uspsaDivShortNames } from "@shared/constants/divisions";

import { Classifiers } from "../../api/src/db/classifiers";
import { connect } from "../../api/src/db/index";

const classifiersForDivision = async (division: string) =>
  Classifiers.find({
    division,
    classifier: /25-/,
  })
    .sort({ classifier: 1 })
    .populate("recHHFs");

const go = async () => {
  await connect();

  for (const division of uspsaDivShortNames) {
    console.log("");
    console.log(`<${division}>`);
    const classifiers = await classifiersForDivision(division);
    classifiers.forEach(({ classifier, name, recHHFs: { recHHF } }) => {
      console.log(
        `    ${classifier} ${name.replace("#", "\\#").replace("&", "\\&")} & ${recHHF.toFixed(4)} \\\\`,
      );
      console.log("    \\hline");
    });
    console.log(`</${division}>`);
  }

  console.error("\ndone");
  process.exit(0);
};

go();
