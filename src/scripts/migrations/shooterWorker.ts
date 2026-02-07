/**
 * Shooter Worker - Payload Local API Version
 *
 * Worker for parallel shooter reclassification using Piscina.
 * This is the Payload-compatible version of scripts/migrations/shooterWorker.ts
 */

import { initPayload } from "../../lib/payload-local";
import { reclassifyShooters } from "../../../api/src/db/shooters";

interface ShooterBatch {
  memberNumberDivision: string;
  name: string;
  memberNumber: string;
  division: string;
}

const worker = async (batch: ShooterBatch[]) => {
  await reclassifyShooters(batch);
  process.stdout.write(".");
};

const initialize = async () => {
  await initPayload();
  return worker;
};

export default initialize();
