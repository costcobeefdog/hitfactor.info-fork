/**
 * Scores Loop Script - Payload Local API Version
 *
 * Processes match scores from PractiScore and saves them to the database.
 * This is the Payload-compatible version of scripts/upload/scoresLoop.ts
 *
 * This script uses Payload to initialize the MongoDB connection, then
 * delegates to the existing upload logic which uses Mongoose models.
 *
 * Usage: npx tsx src/scripts/upload/scoresLoop.ts
 */

/* eslint-disable no-console */

import {
  initPayload,
  bulkWrite,
  countDocuments,
  findDocuments,
  shutdown,
} from "../../lib/payload-local";

// Import the existing upload logic
// These modules use Mongoose models which will work once Payload initializes the connection
import {
  findAFewMatches,
  matchesForUploadFilter,
  uploadMatches,
} from "../../../api/src/worker/uploads";

interface Match {
  _id: string;
  uuid: string;
  updated: Date;
  uploaded?: Date;
  hasScores?: boolean;
  toObject?: () => Record<string, unknown>;
}

const scoresLoop = async ({ batchSize = 12 } = {}) => {
  const onlyUSPSAorSCSA = {
    templateName: { $in: ["USPSA" /*, "Steel Challenge"*/] },
  };

  const count = await countDocuments(
    "matches",
    matchesForUploadFilter(onlyUSPSAorSCSA),
  );
  console.log(`${count} uploads in the queue (USPSA only)`);

  let numberOfUpdates = 0;
  let fewMatches: Match[] = [];
  let totalMatchesUploaded = 0;

  do {
    // Use the existing Mongoose-based findAFewMatches
    // It works because Payload has initialized the connection
    fewMatches = await findAFewMatches(onlyUSPSAorSCSA, batchSize);
    totalMatchesUploaded += fewMatches.length;

    if (!fewMatches.length) {
      return numberOfUpdates;
    }

    // Use the existing upload logic
    const uploadResults = await uploadMatches({ matches: fewMatches });
    numberOfUpdates += uploadResults.classifiers?.length || 0;

    const matchesWithScoresUUIDs = uploadResults?.matches || [];

    const uuidsWithStatus = Object.fromEntries(
      fewMatches.map((m) => [
        m.uuid,
        matchesWithScoresUUIDs.includes(m.uuid) ? "✅" : "❌",
      ]),
    );
    console.log(uuidsWithStatus);

    console.log(
      `${uploadResults?.classifiers?.length || 0} classifiers; ${
        uploadResults?.shooters?.length || 0
      } shooters; ${uploadResults?.matchResults?.length || 0} match results`,
    );

    // Update matches using Payload Local API bulk operations
    await bulkWrite(
      "matches",
      fewMatches.map((m) => ({
        updateOne: {
          filter: { _id: m._id },
          update: {
            $set: {
              ...(m.toObject ? m.toObject() : m),
              uploaded: new Date(),
              hasScores: matchesWithScoresUUIDs.includes(m.uuid),
            },
          },
        },
      })),
    );

    console.log(`done ${totalMatchesUploaded}/${count}`);
  } while (fewMatches.length);

  return numberOfUpdates;
};

/**
 * Main entry point.
 */
const go = async () => {
  await initPayload();

  const numberOfUpdates = await scoresLoop();
  console.log(`total number of updates: ${numberOfUpdates}`);

  await shutdown();
};

go();
