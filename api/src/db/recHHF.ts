import uniqBy from "lodash.uniqby";
import mongoose from "mongoose";

import {
  allDivShortNames,
  divisionsForRecHHFAdapter,
  PROD_15_EFFECTIVE_TS,
} from "@api/dataUtil/divisions";
import {
  curHHFForDivisionClassifier,
  oldHHFForDivisionClassifier,
} from "@api/dataUtil/hhf";
import { Score, Scores } from "@api/db/scores";
import { RecHHF } from "@data/types/RecHHF";
import {
  classifiersThatUseMoreThan10RoundsBetweenReloads,
  uspsaClassifiers2025,
} from "@shared/constants/classifiers";
import { solveWeibull } from "@shared/utils/weibull";

const runsForRecs = async ({ division, number }): Promise<Score[]> =>
  Scores.find({
    classifier: number,
    division: { $in: divisionsForRecHHFAdapter(division) },
    hf: { $gt: 0 },
    bad: { $ne: true },
  })
    .sort({ hf: -1 })
    .limit(0)
    .lean();

const RecHHFSchema = new mongoose.Schema<RecHHF>({
  classifier: String,
  division: String,
  classifierDivision: String,

  oldHHF: Number,
  curHHF: Number,
  recHHF: Number,

  // Weibull
  k: Number,
  lambda: Number,
  wbl1HHF: Number,
  wbl3HHF: Number,
  wbl5HHF: Number,
  wbl15HHF: Number,
  kurtosis: Number,
  skewness: Number,
  meanSquaredError: Number,
  meanAbsoluteError: Number,
  superMeanSquaredError: Number,
  superMeanAbsoluteError: Number,
  maxError: Number,

  // Prod 10 vs 15 extras
  prod10HHF: Number,
  prod15HHF: Number,

  // LO: LOCO vs LO vs CO extras
  loHHF: Number,
  locoHHF: Number,
  coHHF: Number,
});

RecHHFSchema.index({ classifier: 1, division: 1 }, { unique: true });
RecHHFSchema.index({ classifierDivision: 1 }, { unique: true });

export const RecHHFs = mongoose.models.RecHHFs || mongoose.model("RecHHFs", RecHHFSchema);

const extraHHFsForProd = (allScoresRecHHF: number, runs: Score[], classifier: string) => {
  const prod10Runs = runs
    .filter(c => new Date(c.sd).getTime() < PROD_15_EFFECTIVE_TS)
    .map(c => c.hf);
  const prod15Runs = runs
    .filter(c => new Date(c.sd).getTime() >= PROD_15_EFFECTIVE_TS)
    .map(c => c.hf);
  const { hhf: prod10HHF } = solveWeibull(prod10Runs);
  const { hhf: prod15HHF } = solveWeibull(prod15Runs);
  const prodAll1015HHF = Math.max(allScoresRecHHF, prod10HHF, prod15HHF);

  const needsMoreThan10 =
    classifiersThatUseMoreThan10RoundsBetweenReloads.includes(classifier);

  return {
    recHHF: needsMoreThan10 ? prodAll1015HHF : allScoresRecHHF,
    prod10HHF,
    prod15HHF,
  };
};

const extraHHFsForLO = (locoHHF: number, locoRuns: Score[]) => {
  const loHFs = locoRuns.filter(c => c.division === "lo").map(c => c.hf);
  const coHFs = locoRuns.filter(c => c.division === "co").map(c => c.hf);
  const { hhf: loHHF } = solveWeibull(loHFs);
  const { hhf: coHHF } = solveWeibull(coHFs);

  return {
    recHHF: Math.max(locoHHF, loHHF, coHHF),
    locoHHF,
    loHHF,
    coHHF,
  };
};

const recHHFUpdate = (runsRaw: Score[], division: string, classifier: string) => {
  if (!runsRaw) {
    return null;
  }

  const runs = minorHFScoresAdapter(runsRaw, division);
  const curHHF = curHHFForDivisionClassifier({ division, number: classifier }) || -1;
  const oldHHF = oldHHFForDivisionClassifier({ division, number: classifier }) || -1;

  const {
    k,
    lambda,
    hhf: wblHHF,
    hhf1: wbl1HHF,
    hhf3: wbl3HHF,
    hhf5: wbl5HHF,
    hhf15: wbl15HHF,
    kurtosis,
    skewness,
    meanSquaredError,
    meanAbsoluteError,
    superMeanSquaredError,
    superMeanAbsoluteError,
    maxError,
  } = solveWeibull(runs.map(c => c.hf));

  return {
    division,
    classifier,
    classifierDivision: [classifier, division].join(":"),
    oldHHF,
    curHHF,
    recHHF: wblHHF,
    ...(division === "prod" ? extraHHFsForProd(wbl3HHF, runs, classifier) : {}),
    ...(division === "lo" ? extraHHFsForLO(wbl3HHF, runs) : {}),

    k,
    lambda,
    wbl1HHF,
    wbl3HHF,
    wbl5HHF,
    wbl15HHF,
    kurtosis,
    skewness,
    meanSquaredError,
    meanAbsoluteError,
    superMeanSquaredError,
    superMeanAbsoluteError,
    maxError,
  };
};

/**
 * Upserts a single recHHF after calculating it from all available scores
 * for the given division/classifier combo
 *
 * Used in initial hydration and to update recHHFs after an upload
 */
export const hydrateSingleRecHFF = async (division, classifier) => {
  const allRuns = await runsForRecs({ division, number: classifier });
  const update = recHHFUpdate(allRuns, division, classifier);

  if (update) {
    return RecHHFs.updateOne(
      { division, classifier },
      { $set: update },
      { upsert: true },
    );
  }
  return null;
};

/* eslint-disable no-console */
export const rehydrateRecHHF = async (
  divisions = allDivShortNames,
  classifiers = uspsaClassifiers2025,
) => {
  console.log("hydrating recommended HHFs");
  console.time("recHHFs");
  console.log(`Divisions: ${divisions.length}, Classifiers: ${classifiers.length}`);

  let i = 1;
  const total = divisions.length * classifiers.length;
  for (const division of divisions) {
    for (const classifier of classifiers) {
      await hydrateSingleRecHFF(division, classifier);
      process.stdout.write(`\r${i}/${total}`);
      ++i;
    }
  }

  console.timeEnd("recHHFs");
};
/* eslint-enable no-console */

export const hydrateRecHHFsForClassifiers = async (
  classifiers: Array<{ classifier: string; division: string }>,
) => {
  const divisions = uniqBy(
    classifiers.map(c => c.division),
    c => c,
  );
  const classifierNumbers = uniqBy(
    classifiers.map(c => c.classifier),
    c => c,
  );

  await rehydrateRecHHF(divisions, classifierNumbers);
};
