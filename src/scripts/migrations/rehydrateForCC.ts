/**
 * Rehydrate For CC Script - Payload Local API Version
 *
 * Full rehydration of RecHHFs, shooters, classifiers, and stats.
 * This is the Payload-compatible version of scripts/migrations/rehydrateForCC.ts
 *
 * Usage: npx tsx src/scripts/migrations/rehydrateForCC.ts
 */

/* eslint-disable no-console */

import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import Piscina from "piscina";

import { uspsaClassifiers2025 } from "@shared/constants/classifiers";

import { rehydrateClassifiers } from "../../../api/src/db/classifiers";
import { rehydrateRecHHF } from "../../../api/src/db/recHHF";
import { hydrateStats } from "../../../api/src/db/stats";
import { uspsaDivShortNames } from "../../../shared/constants/divisions";

import { initPayload, findDocuments, shutdown } from "../../lib/payload-local";

interface Shooter {
  memberNumberDivision: string;
  name: string;
  memberNumber: string;
  division: string;
}

const rehydrateShooters = async (divisions: string[]) => {
  const shooters = await findDocuments<Shooter>(
    "shooters",
    {
      memberNumberDivision: { $exists: true },
      division: { $in: divisions },
    },
    { limit: 0 },
  );

  console.error(
    `Total ${JSON.stringify(divisions)} Shooters to Process: ${shooters.length}`,
  );

  const pool = new Piscina({
    filename: path.resolve(__dirname, "shooterWorker.ts"),
  });

  console.time("shooters");
  const jobs: Promise<void>[] = [];
  const batchSize = 64;
  for (let i = 0; i < shooters.length; i += batchSize) {
    const batch = shooters.slice(i, i + batchSize);
    jobs.push(pool.run(batch));
  }

  await Promise.all(jobs);
  await pool.destroy();
  console.timeEnd("shooters");
};

/**
 * Main entry point.
 */
export const rehydrateForCC = async () => {
  await initPayload();

  const classifiers = uspsaClassifiers2025;
  const divisions = uspsaDivShortNames;
  const classifierDivisions = divisions
    .map(division => classifiers.map(classifier => ({ classifier, division })))
    .flat();

  console.error("rechhf go");
  await rehydrateRecHHF(divisions, classifiers);

  console.error("shooters go");
  await rehydrateShooters(divisions);

  console.error("classifiers go");
  await rehydrateClassifiers(classifierDivisions);

  console.error("stats go");
  await hydrateStats();

  console.error("\ndone");
  await shutdown();
};

// Run if executed directly
rehydrateForCC();
