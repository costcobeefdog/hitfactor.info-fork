/**
 * GET /api/custom/shooters/[division]/[memberNumber]/chart
 * Returns chart data for a shooter.
 */

import { NextRequest, NextResponse } from "next/server";

import { aggregate, findDocuments } from "@/lib/mongodb";
import { divisionsForScoresAdapter, uspsaDivShortNames } from "@/lib/utils/divisions";
import { percentAggregationOp, getFieldFromLookup } from "@/lib/utils/aggregation";

interface Props {
  params: Promise<{ division: string; memberNumber: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division, memberNumber } = await params;

    // Get classifier scores with HHF data
    const classifierScores = await aggregate<Record<string, unknown>>("scores", [
      {
        $match: {
          memberNumber,
          division: { $in: divisionsForScoresAdapter(division) },
          bad: { $ne: true },
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
          recHHF: getFieldFromLookup("rechhfs", "recHHF"),
          curHHF: getFieldFromLookup("rechhfs", "curHHF"),
        },
      },
      {
        $project: { rechhfs: false },
      },
      {
        $addFields: {
          recPercent: percentAggregationOp("$hf", "$recHHF", 4),
          curPercent: percentAggregationOp("$hf", "$curHHF", 4, -1),
        },
      },
      { $sort: { sd: -1 } },
    ]);

    // Convert to chart format
    const classifiers = classifierScores
      .map((run) => ({
        x: run.sd,
        recPercent: run.recPercent,
        curPercent: run.curPercent,
        percent: run.percent,
        classifier: run.classifier,
        source: "Stage Score",
        division: run.division,
      }))
      .filter((run) => !!run.classifier); // no legacy majors in the graph

    // Get match scores for major matches
    const divisionQuery =
      division === "all"
        ? { $in: uspsaDivShortNames }
        : division;
    const matchScores = await findDocuments<Record<string, unknown>>(
      "matchscores",
      {
        division: divisionQuery,
        memberNumber,
      },
      { sort: { date: -1 } },
    );

    // Convert match scores to chart format
    const convertedMatchScores = matchScores
      .filter((c) => (c.level as number) >= 2)
      .map((ms) => ({
        x: ms.date,
        classifier: ms.name,
        source: "Major Match",
        sd: ms.date,
        percent: ms.matchPercent,
        curPercent: ms.bump,
        recPercent: ms.bump,
        eligible: ms.eligible,
        maybeEligible: ms.maybeEligible,
        division: ms.division,
      }));

    // Combine and sort by date
    const result = [...classifiers, ...convertedMatchScores].sort((a, b) => {
      const aTime = new Date(a.x as string).getTime();
      const bTime = new Date(b.x as string).getTime();
      return aTime - bTime;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching shooter chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 },
    );
  }
}
