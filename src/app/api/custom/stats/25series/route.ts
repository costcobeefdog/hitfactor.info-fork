/**
 * GET /api/custom/stats/25series
 * Returns stats for 25-series classifiers.
 */

import { NextResponse } from "next/server";

import { aggregate } from "@/lib/mongodb";

// Cache for 25-series stats (2 hour TTL)
const TWO_HOURS = 2 * 60 * 60_000;
let cachedTime = 0;
let cachedStats: unknown[] | null = null;

export async function GET() {
  try {
    const now = Date.now();

    // Invalidate cache every 2 hours
    if (now - cachedTime >= TWO_HOURS) {
      cachedTime = now;
      cachedStats = null;
    }

    if (!cachedStats) {
      cachedStats = await aggregate("scores", [
        {
          $match: {
            classifier: /25-0\d/,
            subType: "uspsa",
            bad: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              classifier: "$classifier",
              division: "$division",
            },
            scores: { $sum: 1 },
          },
        },
        {
          $addFields: {
            classifier: "$_id.classifier",
            division: "$_id.division",
          },
        },
        { $project: { _id: 0 } },
        { $sort: { scores: -1 } },
      ]);
    }

    return NextResponse.json(cachedStats);
  } catch (error) {
    console.error("Error fetching 25-series stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
