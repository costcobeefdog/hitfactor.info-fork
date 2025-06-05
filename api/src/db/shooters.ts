/* eslint-disable no-console */
import uniqBy from "lodash.uniqby";
import mongoose, { Model, Schema } from "mongoose";
import { v4 as randomUUID } from "uuid";

import { ScoreObjectWithVirtuals, Scores } from "@api/db/scores";
import { getField, percentAggregationOp } from "@api/db/utils";
import {
  classForPercent,
  ClassLetter,
  percentForClass,
} from "@shared/classification/brackets";
import { ClassificationState } from "@shared/classification/state";

import { scoresForMode } from "./matchScores";

import { calculateUSPSAClassification } from "../../../shared/classification/engine";
import { classificationDifficulty } from "../../../shared/constants/difficulty";
import {
  divIdToShort,
  hfuDivisionCompatabilityMap,
  hfuDivisionsShortNamesThatNeedMinorHF,
  uspsaDivShortNames,
} from "../dataUtil/divisions";
import { eloPointForShooter } from "../dataUtil/elo";
import { psClassUpdatesByMemberNumber } from "../dataUtil/uspsa";

// TODO: finish up the interfaces as schema
export interface Shooter {
  division: string;
  memberNumber: string;
  memberNumberDivision: string;
  name: string;
  memberId: string;
  current: number;
  hqClass: string;
  hqClassRank: number;
  class: string;

  elo?: number;

  // current
  reclassificationsRecPercentUncappedCurrent: number;
  recUncappedClassCurrent: string;
  recUncappedClassCurrentRank: number;

  // high
  reclassificationsRecPercentUncappedHigh: number;
  recUncappedClassHigh: string;
  recUncappedClassHighRank: number;

  // majors vs classifiers
  reclassificationsMajorsCurrent: number;
  reclassificationsClassifiersCurrent: number;

  age: number;
  age1: number;
}

type ShooterModel = Model<Shooter, object>;
const ShooterSchema = new Schema<Shooter, ShooterModel>({}, { strict: false });
ShooterSchema.index({ memberNumber: 1, division: 1 });
ShooterSchema.index({ memberNumber: 1 });
ShooterSchema.index({ memberNumberDivision: 1 });
ShooterSchema.index({ memberId: 1 });
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentCurrent: -1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  class: 1,
  division: 1,
  reclassificationsRecPercentCurrent: -1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  class: 1,
  division: 1,
  hqToRecPercent: 1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  class: 1,
  division: 1,
  reclassificationsCurPercentCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentUncappedCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsRecPercentUncappedCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsMajorsCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsMajorsCurrent: 1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsClassifiersCurrent: -1,
});
ShooterSchema.index({
  division: 1,
  reclassificationsClassifiersCurrent: 1,
});

export const Shooters =
  mongoose.models.Shooters || mongoose.model("Shooters", ShooterSchema);

export const reduceByDiv = (classifications, valueFn) =>
  classifications.reduce(
    (acc, c) => ({
      ...acc,
      [divIdToShort[c.division_id]]: valueFn(c),
    }),
    {},
  );

/**
 * Selects all scores of multiple shooters (all divisions).
 * Used for reclassification (HQ alg makes divisions cross-dependent for C flag)
 */
export const allDivisionsScores = async memberNumbers => {
  const query = Scores.find({
    memberNumber: { $in: memberNumbers },
    bad: { $ne: true },
  })
    .populate("HHFs")
    .limit(0)
    .sort({ sd: -1 });
  const data = await query;

  return data.map(doc => {
    const obj: ScoreObjectWithVirtuals = doc.toObject<ScoreObjectWithVirtuals>({
      virtuals: true,
    });
    const classifier = obj.isMajor ? obj._id : obj.classifier;
    const classifierDivision = `${classifier}:${obj.division}`;
    return { ...obj, classifier, classifierDivision };
  });
};

export const allDivisionsScoresByMemberNumber = async memberNumbers => {
  const scores = await allDivisionsScores(memberNumbers);
  return scores.reduce((acc, cur) => {
    const curMemberScores = acc[cur.memberNumber] ?? [];
    curMemberScores.push(cur);
    acc[cur.memberNumber] = curMemberScores;
    return acc;
  }, {});
};

const _divisionExplosion = () => [
  {
    $set: {
      hfuDivisionCompatabilityMap: { $objectToArray: hfuDivisionCompatabilityMap },
    },
  },
  {
    $set: {
      division: [
        "$division",
        getField({ input: "$hfuDivisionCompatabilityMap", field: "$division" }),
      ],
    },
  },
  { $unwind: { path: "$division" } },
  { $match: { division: { $ne: null } } }, // easier to unmatch than to filter lol
  { $unset: "hfuDivisionCompatabilityMap" },
];

// duplicates non-hfu-division scores, adding hfu-division scores
const _addHFUDivisions = () => [
  ..._divisionExplosion(),
  {
    $match: {
      $or: [
        { division: { $nin: hfuDivisionsShortNamesThatNeedMinorHF } },
        { minorHF: { $gt: 0 } },
      ],
    },
  },
  {
    $set: {
      hf: {
        $cond: {
          if: { $in: ["$division", hfuDivisionsShortNamesThatNeedMinorHF] },
          then: "$minorHF",
          else: "$hf",
        },
      },
    },
  },
];

/**
 * Replaces same day dupes with a single average run, same as
 * scoresForRecommendedClassification(), but in memory.
 *
 * Used for What If Recommended Classification calculation
 */
export const dedupeGrandbagging = (scores: ScoreObjectWithVirtuals[]) =>
  Object.values(
    scores.reduce(
      (acc, cur) => {
        cur.classifier = cur.classifier || randomUUID();
        const date = new Date(cur.sd).toLocaleDateString();
        const key = [date, cur.classifier].join(":");
        acc[key] = acc[key] || [];
        acc[key].push(cur);
        return acc;
      },
      {} as Record<string, ScoreObjectWithVirtuals[]>,
    ),
  ).map(oneDayScores => {
    if (oneDayScores.length === 1) {
      return oneDayScores[0];
    }

    const avgHf =
      oneDayScores.reduce((acc, cur) => acc + cur.hf, 0) / oneDayScores.length;
    const avgRecPercent =
      oneDayScores.reduce((acc, cur) => acc + cur.recPercent, 0) / oneDayScores.length;

    return { ...oneDayScores[0], hf: avgHf, recPercent: avgRecPercent };
  });

export const scoresForRecommendedClassification = (
  memberNumbers: string[],
  division?: string,
  until?: Date,
) =>
  Scores.aggregate([
    {
      $match: {
        bad: { $ne: true },
        source: { $ne: "Major Match" }, // majors only come from MatchScores now
        memberNumber: { $in: memberNumbers },
        $or: [{ hf: { $gt: 0 } }, { percent: { $gt: 0 } }],

        // optional filtering
        ...(!division ? {} : { division }),
        ...(!until ? {} : { sd: { $lt: until } }),
      },
    },
    {
      $project: {
        hf: true,
        minorHF: true,
        division: true,
        classifier: true,
        classifierDivision: true,
        sd: true,
        memberNumber: true,
        percent: true,
        source: true,
      },
    },
    // ensure classifier and classifierDivision fields for Majors
    {
      $set: {
        classifier: {
          $cond: {
            if: { $eq: ["$source", "Major Match"] },
            then: { $toString: "$_id" },
            else: { $ifNull: ["$classifier", { $toString: "$_id" }] },
          },
        },
      },
    },
    ..._addHFUDivisions(),
    {
      $set: { classifierDivision: { $concat: ["$classifier", ":", "$division"] } },
    },
    // calculate recPercent before sorting/deduping, so we can use it as secondary sort
    {
      $lookup: {
        from: "rechhfs",
        localField: "classifierDivision",
        foreignField: "classifierDivision",
        as: "HHFs",
      },
    },
    {
      $unwind: {
        path: "$HHFs",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        recHHF: "$HHFs.recHHF",
        curHHF: "$HHFs.curHHF",
      },
    },
    {
      $addFields: {
        recPercent: {
          $cond: {
            if: { $eq: ["$source", "Major Match"] },
            then: "$percent",
            else: percentAggregationOp("$hf", "$recHHF", 4),
          },
        },
        curPercent: {
          $cond: {
            if: { $eq: ["$source", "Major Match"] },
            then: "$percent",
            else: percentAggregationOp("$hf", "$curHHF", 4),
          },
        },
      },
    },
    // limit up to 10 div/memberNumber unique scores before applying daily dupe.avg
    { $sort: { sd: -1, recPercent: -1 } },
    {
      $group: {
        _id: ["$classifier", "$division", "$memberNumber", "$sd"],
        docs: { $push: "$$ROOT" },
        sd: { $first: "$sd" },
        classifier: { $first: "$classifier" },
        division: { $first: "$division" },
        memberNumber: { $first: "$memberNumber" },
      },
    },
    {
      $group: {
        _id: ["$division", "$memberNumber"],
        divMemberScores: { $push: "$$ROOT" },
        sd: { $first: "$sd" },
      },
    },
    {
      $project: {
        divMemberScores: {
          $sortArray: { input: "$divMemberScores", sortBy: { sd: -1 } },
        },
      },
    },
    { $unwind: { path: "$divMemberScores" } },
    { $replaceRoot: { newRoot: "$divMemberScores" } },
    { $unwind: { path: "$docs" } },
    { $replaceRoot: { newRoot: "$docs" } },

    // use avg score for dupes within the day and count them as one classifier in best 6 out of 10
    {
      $group: {
        _id: ["$classifier", "$division", "$memberNumber", "$sd"],
        hf: { $avg: "$hf" },
        sd: { $first: "$sd" },
        memberNumber: { $first: "$memberNumber" },
        division: { $first: "$division" },
        classifier: { $first: "$classifier" },
        classifierDivision: { $first: "$classifierDivision" },
        percent: { $avg: "$percent" },
        curPercent: { $avg: "$curPercent" },
        recPercent: { $avg: "$recPercent" },
        source: { $first: "$source" },
      },
    },
    {
      $project: {
        _id: false,
        HHFs: false,
      },
    },
    { $sort: { sd: -1, recPercent: -1 } },
  ]);

export const scoresForRecommendedClassificationByMemberNumber = async memberNumbers => {
  const scores = await scoresForMode({ mode: "combined", memberNumbers });
  return scores.reduce((acc, cur) => {
    const curMemberScores = acc[cur.memberNumber] ?? [];
    curMemberScores.push(cur);
    acc[cur.memberNumber] = curMemberScores;
    return acc;
  }, {});
};

interface ReclassificationBreakdownResult {
  current: number;
  high: number;
  classCurrent: ClassLetter;
  classHigh: ClassLetter;
  age: number;
  age1: number;
}
const reclassificationBreakdown = (
  reclassificationInfo: ClassificationState,
  division: string,
): ReclassificationBreakdownResult => ({
  current: Number((reclassificationInfo?.[division]?.percent ?? 0).toFixed(4)),
  high: Number((reclassificationInfo?.[division]?.highPercent ?? 0).toFixed(4)),
  classCurrent: classForPercent(reclassificationInfo?.[division]?.percent),
  classHigh: classForPercent(reclassificationInfo?.[division]?.highPercent),
  age: reclassificationInfo?.[division]?.age,
  age1: reclassificationInfo?.[division]?.age1,
});

const recalc = (scores, date: Date, division: string) =>
  reclassificationBreakdown(
    calculateUSPSAClassification(
      scores,
      "recPercent",
      date,
      classificationDifficulty.window.min,
      classificationDifficulty.window.best,
      classificationDifficulty.window.recent,
      classificationDifficulty.percentCap,
    ),
    division,
  );

export const reclassifyShooters = async shooters => {
  try {
    const now = new Date();
    const memberNumbers = uniqBy(shooters, s => s.memberNumber).map(s => s.memberNumber);
    const [recScoresByMemberNumber, psClassUpdates] = await Promise.all([
      scoresForRecommendedClassificationByMemberNumber(memberNumbers),
      psClassUpdatesByMemberNumber(),
    ]);

    const updates = shooters
      .filter(
        ({ memberNumber, division }) =>
          memberNumber && uspsaDivShortNames.find(x => x === division),
      )
      .map(({ memberNumber, division, name }) => {
        if (!memberNumber) {
          return [];
        }
        const recScores = recScoresByMemberNumber[memberNumber] || [];
        const recalcDivRecUncapped = recalc(recScores, now, division);

        const majorMatchScores = recScores.filter(s => s.source === "Major Match");
        const recalcMajors = recalc(majorMatchScores, now, division);

        const classifierScores = recScores.filter(s => s.source !== "Major Match");
        const recalcClassifiers = recalc(classifierScores, now, division);

        const hqClass = psClassUpdates?.[memberNumber]?.[division] || "U";

        return [
          {
            updateOne: {
              filter: { memberNumber, division },
              update: {
                $setOnInsert: {
                  name,
                  memberNumber,
                  division,
                  memberNumberDivision: [memberNumber, division].join(":"),
                  current: percentForClass(hqClass),
                },
              },
              upsert: true,
            },
          },
          {
            updateOne: {
              filter: { memberNumber, division },
              update: [
                {
                  $unset: [
                    "reclassifications",
                    "ages",
                    "age1s",
                    "classes",
                    "currents",
                    "reclassificationsBrutalPercentCurrent",
                    "hqToBrutalPercent",
                    "hqToCurHHFPercent",
                    "hqToRecPercent",
                    "reclassificationsCurPercentCurrent",
                    "reclassificationsRecPercentCurrent",
                    "curHHFClass",
                    "curHHFClassRank",
                    "recClass",
                    "recClassRank",
                    "brutalClass",
                    "brutalClassRank",
                    "reclassificationsRecHHFOnlyPercentCurrent",
                    "reclassificationsSoftPercentCurrent",
                    "recHHFOnlyClass",
                    "recHHFOnlyClassRank",
                    "recSoftClass",
                    "recSoftClassRank",
                    "recUncappedClass",
                    "recUncappedClassRank",
                    "reclassificationsCurPercentHigh",
                    "reclassificationsRecHHFOnlyPercentHigh",
                    "reclassificationsSoftPercentHigh",
                    "reclassificationsRecPercentHigh",
                    "benefit",
                    "benefitHigh",
                  ],
                },
                {
                  $set: {
                    hqClass,
                    hqClassRank: percentForClass(hqClass),
                    class: hqClass,
                    memberId: psClassUpdates?.[memberNumber]?.memberId,

                    age: recalcDivRecUncapped?.age,
                    age1: recalcDivRecUncapped?.age1,

                    elo: eloPointForShooter(division, memberNumber)?.rating,
                    reclassificationsRecPercentUncappedCurrent:
                      recalcDivRecUncapped.current, //aka recPercentUncapped
                    reclassificationsRecPercentUncappedHigh: recalcDivRecUncapped.high, // aka recPercentUncappedHigh

                    reclassificationsMajorsCurrent: recalcMajors.current,
                    reclassificationsClassifiersCurrent: recalcClassifiers.current,

                    recUncappedClassCurrent: recalcDivRecUncapped.classCurrent,
                    recUncappedClassCurrentRank: percentForClass(
                      recalcDivRecUncapped.classCurrent,
                    ),

                    recUncappedClassHigh: recalcDivRecUncapped.classHigh,
                    recUncappedClassHighRank: percentForClass(
                      recalcDivRecUncapped.classHigh,
                    ),
                  },
                },
              ],
              upsert: true,
            },
          },
        ];
      })
      .flat();
    await Shooters.bulkWrite(updates.filter(Boolean));
  } catch (error) {
    console.log("reclassifyShooters error:");
    console.log(error);
  }
};

export const reEloShooters = async shooters => {
  try {
    const updates = shooters
      .filter(
        ({ memberNumber, division }) =>
          memberNumber && uspsaDivShortNames.find(x => x === division),
      )
      .map(({ memberNumber, division }) => {
        if (!memberNumber) {
          return [];
        }

        return [
          {
            updateOne: {
              filter: { memberNumber, division },
              update: [
                {
                  $set: {
                    elo: eloPointForShooter(division, memberNumber)?.rating,
                  },
                },
              ],
              upsert: true,
            },
          },
        ];
      })
      .flat();
    await Shooters.bulkWrite(updates.filter(Boolean));
  } catch (error) {
    console.log("reEloShooters error:");
    console.log(error);
  }
};
