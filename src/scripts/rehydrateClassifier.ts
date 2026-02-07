/**
 * Rehydrate Classifier Script - Payload Local API Version
 *
 * Rehydrates RecHHFs and classifier metadata for a single classifier.
 * This is the Payload-compatible version of scripts/rehydrateClassifier.ts
 *
 * Usage: npx tsx src/scripts/rehydrateClassifier.ts <classifier>
 */

/* eslint-disable no-console */

import { initPayload, bulkWrite, findDocuments, shutdown } from "../lib/payload-local";

// Import existing utilities from the original API
import { singleClassifierExtendedMetaDoc } from "../../api/src/db/classifiers";
import { rehydrateRecHHF } from "../../api/src/db/recHHF";
import type { RecHHF } from "../../data/types/RecHHF";
import { allDivShortNames } from "../../shared/constants/divisions";

/**
 * Rehydrate a single classifier across all divisions.
 */
const rehydrateOneClassifier = async (classifier: string) => {
  console.log(`rehydrating rechhf for ${classifier}`);
  await rehydrateRecHHF(allDivShortNames, [classifier]);
  console.log("done");

  const classifierDivisions = [classifier]
    .map(c => allDivShortNames.map(div => [c, div].join(":")))
    .flat();

  console.log(`classifier-division pairs: ${classifierDivisions.join(", ")}`);

  // Get RecHHFs using Payload Local API
  const recHHFs = await findDocuments<RecHHF>(
    "rechhfs",
    { classifierDivision: { $in: classifierDivisions } },
  );

  const recHHFsByClassifierDivision = recHHFs.reduce(
    (acc, cur) => {
      acc[cur.classifierDivision] = cur;
      return acc;
    },
    {} as Record<string, RecHHF>,
  );
  console.log(`recHHFs: \n${JSON.stringify(recHHFsByClassifierDivision, null, 2)}`);

  console.log("writing classifiers");
  let i = 0;
  for (const classifierDivision of classifierDivisions) {
    const [curClassifier, division] = classifierDivision.split(":");
    const doc = await singleClassifierExtendedMetaDoc(
      division,
      curClassifier,
      recHHFsByClassifierDivision[[curClassifier, division].join(":")],
    );

    await bulkWrite("classifiers", [
      {
        updateOne: {
          filter: { division: doc.division, classifier: doc.classifier },
          update: { $set: doc },
          upsert: true,
        },
      },
    ]);
    ++i;
    process.stdout.write(`\r${i}/${classifierDivisions.length}`);
  }
  console.log("\ndone");
};

/**
 * Main entry point.
 */
export const rehydrateClassifier = async (classifier: string) => {
  if (!classifier) {
    console.error("must specify classifier as CLI argument");
    process.exit(1);
  }

  await initPayload();
  await rehydrateOneClassifier(classifier);
  console.log("all done");

  await shutdown();
};

// Run if executed directly
const classifier = process.argv[2];
rehydrateClassifier(classifier);
