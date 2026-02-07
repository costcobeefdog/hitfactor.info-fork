/**
 * Stats Meta Loop Script - Payload Local API Version
 *
 * Runs the meta-processing loops for RecHHFs, shooters, classifiers, and stats.
 * This is the Payload-compatible version of scripts/upload/statsMetaLoop.ts
 *
 * This script uses Payload to initialize the MongoDB connection, then
 * delegates to the existing metaLoop logic which uses Mongoose models.
 *
 * Usage: npx tsx src/scripts/upload/statsMetaLoop.ts
 */

/* eslint-disable no-console */

import { initPayload, shutdown } from "../../lib/payload-local";

// Import the existing meta loop logic
import { metaLoop } from "../../../api/src/worker/uploads";

/**
 * Main entry point.
 */
export const statsMetaLoop = async () => {
  await initPayload();

  console.log("Starting meta loop...");
  await metaLoop();
  console.log("Meta loop completed");

  await shutdown();
};

statsMetaLoop();
