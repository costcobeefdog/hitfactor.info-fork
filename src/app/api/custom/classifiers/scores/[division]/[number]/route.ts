/**
 * GET /api/custom/classifiers/scores/[division]/[number]
 * Returns paginated classifier runs/scores with shooter data.
 */

import { NextRequest, NextResponse } from "next/server";

import { aggregate } from "@/lib/mongodb";
import { N, HF, PositiveOrMinus1 } from "@/lib/utils/numbers";
import {
  percentAggregationOp,
  addPlaceAndPercentileAggregation,
  multiSortAndPaginate,
  textSearchMatch,
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

    const sort = searchParams.get("sort") || undefined;
    const order = searchParams.get("order") || undefined;
    const page = searchParams.get("page") || "1";
    const filterString = searchParams.get("filter") || undefined;
    const filterClubString = searchParams.get("club") || undefined;

    const pipeline = [
      {
        $project: {
          __v: false,
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
          // score data for RunsTable
          recHHF: getRecHHFField("recHHF"),
          curHHF: getRecHHFField("curHHF"),
          oldHHF: getRecHHFField("oldHHF"),

          // shooter data for ShooterCell
          hqClass: getShooterField("class"),
          hqCurrent: getShooterField("current"),
          name: getShooterField("name"),
          recClass: getShooterField("recClass"),
          curHHFClass: getShooterField("curHHFClass"),
          current: getShooterField("current"),
          reclassificationsCurPercentCurrent: getShooterField(
            "reclassificationsCurPercentCurrent",
          ),
          reclassificationsCurPercentHigh: getShooterField(
            "reclassificationsCurPercentHigh",
          ),
          reclassificationsRecPercentCurrent: getShooterField(
            "reclassificationsRecPercentCurrent",
          ),
          reclassificationsRecPercentUncappedCurrent: getShooterField(
            "reclassificationsRecPercentUncappedCurrent",
          ),
          reclassificationsRecPercentUncappedHigh: getShooterField(
            "reclassificationsRecPercentUncappedHigh",
          ),
        },
      },
      {
        $project: {
          shooters: false,
          rechhfs: false,
          memberNumberDivision: false,
          classifier: false,
        },
      },
      {
        $addFields: {
          recPercent: percentAggregationOp("$hf", "$recHHF", 4),
          curPercent: percentAggregationOp("$hf", "$curHHF", 4, -1),
          oldPercent: percentAggregationOp("$hf", "$oldHHF", 4),
        },
      },
      ...addPlaceAndPercentileAggregation(
        "hf",
        [
          ...(!filterString
            ? []
            : [{ $match: textSearchMatch(["memberNumber", "name"], filterString) }]),
          ...(!filterClubString ? [] : [{ $match: { clubid: filterClubString } }]),
        ],
        multiSortAndPaginate({ sort, order, page }),
        division.startsWith("scsa_") ? "tooManyDocs" : "normal",
      ),
    ];

    const runsFromDB = await aggregate<Record<string, unknown>>("scores", pipeline);

    const runs = runsFromDB.map((run, index) => {
      const percent = N(run.percent as number);
      const curPercent = PositiveOrMinus1(run.curPercent as number);
      const recPercent = PositiveOrMinus1(run.recPercent as number);
      const percentMinusCurPercent = N(percent - curPercent);

      return {
        ...run,
        sd: new Date(run.sd as string).toLocaleDateString("en-us", {
          timeZone: "UTC",
        }),
        historicalHHF: HF((100 * (run.hf as number)) / (run.percent as number)),
        percent,
        curPercent,
        recPercent,
        percentMinusCurPercent: percent >= 100 ? 0 : percentMinusCurPercent,
        classifier: number,
        index,
      };
    });

    return NextResponse.json({
      runs,
      runsTotal: (runsFromDB[0]?.total as number) || 0,
      runsTotalWithFilters: (runsFromDB[0]?.totalWithFilters as number) || 0,
      runsPage: Number(page) || 1,
    });
  } catch (error) {
    console.error("Error fetching classifier scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch classifier scores" },
      { status: 500 },
    );
  }
}
