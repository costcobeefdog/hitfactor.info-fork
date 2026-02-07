/**
 * Single Match Upload Script - Payload Local API Version
 *
 * Uploads a single match by UUID, processes scores, and runs meta loop.
 * This is the Payload-compatible version of scripts/upload/singleMatch.ts
 *
 * Usage: npx tsx src/scripts/upload/singleMatch.ts <matchUUID> [templateName]
 */

/* eslint-disable no-console */

import { initPayload, bulkWrite, shutdown } from "../../lib/payload-local";

// Import existing utilities from the original API
import { matchFromMatchDef } from "../../../api/src/db/matches";
import { metaLoop, uploadMatches } from "../../../api/src/worker/uploads";
import { fetchPS } from "../../../api/src/worker/uploadsCommon";

interface Match {
  uuid: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Main entry point.
 */
export const singleMatch = async (matchUUID: string, matchTemplateName?: string) => {
  if (!matchUUID) {
    console.error("must provide match uuid");
    process.exit(1);
  }

  // Fetch match data from PractiScore
  console.log(`Fetching match ${matchUUID}...`);
  const { matchDef } = await fetchPS(matchUUID);
  const match = matchFromMatchDef(matchDef, matchTemplateName) as unknown as Match;

  console.log(JSON.stringify(match, null, 2));

  if (!match?.name) {
    console.error("bad match");
    process.exit(1);
  }

  // Initialize Payload (connects to MongoDB)
  await initPayload();

  // Save match to database
  console.log("Saving match...");
  await bulkWrite("matches", [
    {
      updateOne: {
        filter: { uuid: match.uuid },
        update: { $set: match },
        upsert: true,
      },
    },
  ]);

  // Upload and process scores
  console.log("Uploading scores...");
  await uploadMatches({ matches: [match] });

  // Mark match as uploaded
  await bulkWrite("matches", [
    {
      updateOne: {
        filter: { uuid: match.uuid },
        update: {
          $set: {
            uploaded: new Date(),
            hasScores: true,
          },
        },
      },
    },
  ]);
  console.log("Marked match as uploaded");

  // Run meta loop to update stats
  console.log("Running meta loop...");
  await metaLoop();

  console.log("Done");
  await shutdown();
};

// Run if executed directly
const matchUUID = process.argv[2];
const matchTemplateName = process.argv[3];
singleMatch(matchUUID, matchTemplateName);
