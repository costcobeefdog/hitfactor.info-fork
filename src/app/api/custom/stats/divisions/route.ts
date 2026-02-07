/**
 * GET /api/custom/stats/divisions
 * Returns division popularity stats.
 */

import { NextRequest, NextResponse } from "next/server";

import { aggregate } from "@/lib/mongodb";
import { Percent } from "@/lib/utils/numbers";
import { uspsaDivShortNames } from "@/lib/utils/divisions";

// Static division stats mode - return disabled if enabled
const useStaticDivisionStats = true;

interface DivisionStats {
  _id: string;
  scores: number;
  start?: Date;
  end?: Date;
  percent?: number;
}

// Cache for division stats by year
const divisionsPopularityCache: Record<number, DivisionStats[]> = {};

const uspsaDivisionsPopularity = async (year = 0): Promise<DivisionStats[]> => {
  const after = 365 * (year + 1);
  const before = 365 * year;

  return aggregate<DivisionStats>("scores", [
    {
      $project: {
        division: true,
        sd: true,
        age: {
          $dateDiff: {
            startDate: "$sd",
            endDate: "$$NOW",
            unit: "day",
          },
        },
      },
    },
    {
      $match: {
        age: { $lte: after, $gte: before },
        division: { $in: uspsaDivShortNames },
      },
    },
    {
      $group: {
        _id: "$division",
        scores: {
          $sum: 1,
        },
      },
    },
    {
      $addFields: {
        start: {
          $dateSubtract: {
            startDate: "$$NOW",
            unit: "day",
            amount: after,
          },
        },
        end: {
          $dateSubtract: {
            startDate: "$$NOW",
            unit: "day",
            amount: before,
          },
        },
      },
    },
    { $sort: { scores: -1 } },
  ]);
};

export async function GET(request: NextRequest) {
  try {
    if (useStaticDivisionStats) {
      return NextResponse.json({ disabled: 1 });
    }

    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year")) || 0;

    let data = divisionsPopularityCache[year];
    if (!data) {
      data = await uspsaDivisionsPopularity(year);
      divisionsPopularityCache[year] = data;
    }

    const total = data.reduce((acc: number, cur) => acc + (cur.scores || 0), 0);

    const dataWithPercent = data.map((cur) => ({
      ...cur,
      percent: Percent(cur.scores || 0, total),
    }));

    return NextResponse.json({ data: dataWithPercent, total });
  } catch (error) {
    console.error("Error fetching division stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
