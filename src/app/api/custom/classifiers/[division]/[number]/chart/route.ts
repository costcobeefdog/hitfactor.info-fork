/**
 * GET /api/custom/classifiers/[division]/[number]/chart
 * Returns chart data for a classifier.
 */

import { NextRequest, NextResponse } from "next/server";

import { aggregate } from "@/lib/mongodb";
import { HF, Percent, PositiveOrMinus1 } from "@/lib/utils/numbers";
import {
  percentAggregationOp,
  getFieldFromLookup,
} from "@/lib/utils/aggregation";
import {
  divisionsForScoresAdapter,
  hfuDivisionsShortNamesThatNeedMinorHF,
  L10_OPTICS_EFFECTIVE_TS,
} from "@/lib/utils/divisions";

interface Props {
  params: Promise<{ division: string; number: string }>;
}

const getShooterField = (field: string) => getFieldFromLookup("shooters", field);
const getRecHHFField = (field: string) => getFieldFromLookup("rechhfs", field);

const replaceHFWithMinorHFIfNeeded = (division: string) =>
  !hfuDivisionsShortNamesThatNeedMinorHF.includes(division)
    ? []
    : [
        {
          $addFields: {
            originalHF: "$hf",
            hf: "$minorHF",
          },
        },
      ];

const matchScoresForClassifierDivision = (number: string, division: string) => ({
  $match: {
    classifier: number,
    division: { $in: divisionsForScoresAdapter(division) },
    hf: { $gt: 0 },
    bad: { $ne: true },
    ...(division === "l10"
      ? { sd: { $gte: new Date(L10_OPTICS_EFFECTIVE_TS) } }
      : {}),
  },
});

const overwriteDivision = (division: string) => ({
  $addFields: {
    originalDivision: "$division",
    division,
    classifierDivision: { $concat: ["$classifier", ":", division] },
    memberNumberDivision: { $concat: ["$memberNumber", ":", division] },
  },
});

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division, number } = await params;
    const { searchParams } = new URL(request.url);

    const full = Number(searchParams.get("full")) || 0;
    const limit = Number(searchParams.get("limit")) || 99999;

    const pipeline = [
      {
        $project: {
          sd: true,
          minorHF: true,
          hf: true,
          memberNumber: true,
          memberNumberDivision: true,
          classifier: true,
          division: true,
          bad: true,
          _id: false,
        },
      },
      ...replaceHFWithMinorHFIfNeeded(division),
      matchScoresForClassifierDivision(number, division),
      overwriteDivision(division),
      {
        $lookup: {
          from: "shooters",
          localField: "memberNumberDivision",
          foreignField: "memberNumberDivision",
          as: "shooters",
        },
      },
      {
        $lookup: {
          from: "rechhfs",
          localField: "classifierDivision",
          foreignField: "classifierDivision",
          as: "rechhfs",
        },
      },
      {
        $addFields: {
          recHHF: getRecHHFField("recHHF"),
        },
      },
      {
        $project: { rechhfs: false },
      },
      {
        $addFields: {
          scoreRecPercent: percentAggregationOp("$hf", "$recHHF", 4),
          curPercent: getShooterField("current"),

          // reclassifications current
          curHHFPercent: getShooterField("reclassificationsCurPercentCurrent"),
          recHHFOnlyPercent: getShooterField(
            "reclassificationsRecHHFOnlyPercentCurrent",
          ),
          recSoftPercent: getShooterField("reclassificationsSoftPercentCurrent"),
          recPercent: getShooterField("reclassificationsRecPercentCurrent"),
          recPercentUncapped: getShooterField(
            "reclassificationsRecPercentUncappedCurrent",
          ),

          // reclassifications high
          curHHFPercentHigh: getShooterField("reclassificationsCurPercentHigh"),
          recHHFOnlyPercentHigh: getShooterField(
            "reclassificationsRecHHFOnlyPercentHigh",
          ),
          recSoftPercentHigh: getShooterField("reclassificationsSoftPercentHigh"),
          recPercentHigh: getShooterField("reclassificationsRecPercentHigh"),
          recPercentUncappedHigh: getShooterField(
            "reclassificationsRecPercentUncappedHigh",
          ),

          elo: getShooterField("elo"),
          name: getShooterField("name"),
        },
      },
      {
        $project: {
          shooters: false,
          recHHFs: false,
          memberNumberDivision: false,
          classifier: false,
          division: false,
        },
      },
      { $sort: { sd: 1 } },
      { $limit: limit },
      { $sort: { hf: -1 } },
      ...(full
        ? []
        : [
            {
              $bucketAuto: {
                groupBy: "$hf",
                buckets: 400,
                output: {
                  hf: { $avg: "$hf" },
                  sd: { $first: "$sd" },
                  curPercent: { $avg: "$curPercent" },
                  curHHFPercent: { $avg: "$curHHFPercent" },
                  recPercent: { $avg: "$recPercent" },
                  scoreRecPercent: { $avg: "$scoreRecPercent" },
                  recPercentUncapped: { $avg: "$recPercentUncapped" },
                },
              },
            },
          ]),
    ];

    const runs = await aggregate<Record<string, unknown>>("scores", pipeline);

    const result = runs.map((run, index, allRuns) => ({
      ...run,
      x: HF(run.hf as number),
      y: PositiveOrMinus1(Percent(index, allRuns.length)),
      memberNumber: (run.memberNumber as string) || "",
      curPercent: (run.curPercent as number) || 0,
      curHHFPercent: (run.curHHFPercent as number) || 0,
      recPercent: (run.recPercent as number) || 0,
      scoreRecPercent: (run.scoreRecPercent as number) || 0,
      date: run.sd ? new Date(run.sd as string).getTime() : undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching classifier chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 },
    );
  }
}
