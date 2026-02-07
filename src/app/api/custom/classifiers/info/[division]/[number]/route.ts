/**
 * GET /api/custom/classifiers/info/[division]/[number]
 * Returns detailed classifier information for a specific division and classifier.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  classifiers,
  basicInfoForClassifier,
} from "@/lib/classifiers";
import { aggregate, findOne } from "@/lib/mongodb";
import {
  divisionsForScoresAdapter,
  L10_OPTICS_EFFECTIVE_TS,
} from "@/lib/utils/divisions";

interface Props {
  params: Promise<{ division: string; number: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division, number } = await params;

    // Find classifier in static data
    const c = classifiers.find((cur) => cur.classifier === number);
    if (!c) {
      return NextResponse.json({ info: null }, { status: 404 });
    }

    const basic = basicInfoForClassifier(c);

    // Fetch from DB in parallel
    const [extended, recHHFInfo, totalScoresResult] = await Promise.all([
      findOne<Record<string, unknown>>("classifiers", {
        division,
        classifier: number,
      }),
      findOne<Record<string, unknown>>("rechhfs", {
        classifier: number,
        division,
      }),
      aggregate<{ totalScores: number }>("scores", [
        {
          $match: {
            classifier: number,
            division: { $in: divisionsForScoresAdapter(division) },
            hf: { $gt: 0 },
            bad: { $ne: true },
            ...(division === "l10"
              ? { sd: { $gte: new Date(L10_OPTICS_EFFECTIVE_TS) } }
              : {}),
          },
        },
        { $count: "totalScores" },
      ]),
    ]);

    const result = {
      info: {
        ...basic,
        ...(extended || {}),
        oldHHF: recHHFInfo?.oldHHF ?? 0,
        curHHF: recHHFInfo?.curHHF ?? 0,
        recHHF: recHHFInfo?.recHHF ?? 0,
        k: recHHFInfo?.k ?? 0,
        lambda: recHHFInfo?.lambda ?? 0,
        totalScores: totalScoresResult?.[0]?.totalScores ?? -1,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching classifier info:", error);
    return NextResponse.json(
      { error: "Failed to fetch classifier info" },
      { status: 500 },
    );
  }
}
