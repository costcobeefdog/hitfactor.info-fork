/**
 * POST /api/custom/shooters/whatif
 * What-if analysis for classification scenarios.
 */

import { NextRequest, NextResponse } from "next/server";

import { findDocuments } from "@/lib/mongodb";

interface WhatIfScore {
  hf: number;
  classifier: string;
  classifierDivision?: string;
  sd?: string;
  source?: string;
  recPercent?: number;
  curPercent?: number;
  division?: string;
}

interface WhatIfRequest {
  scores: WhatIfScore[];
  division: string;
  memberNumber: string;
}

interface RecHHFDoc {
  classifierDivision: string;
  recHHF: number;
  curHHF: number;
  oldHHF?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WhatIfRequest;
    const { scores, division, memberNumber } = body;
    const now = new Date();

    // Find unique classifierDivisions that need HHF lookup
    const lookupHHFs = [
      ...new Set(
        scores
          .filter((s) => s.hf && s.classifier && s.source !== "Major Match")
          .map((s) => {
            s.classifierDivision = [s.classifier, division].join(":");
            return s.classifierDivision;
          }),
      ),
    ];

    // Fetch RecHHFs
    const recHHFs = await findDocuments<RecHHFDoc>("rechhfs", {
      classifierDivision: { $in: lookupHHFs },
    });

    const recHHFsMap = recHHFs.reduce(
      (acc, cur) => {
        acc[cur.classifierDivision] = cur;
        return acc;
      },
      {} as Record<string, RecHHFDoc>,
    );

    // Hydrate scores with calculated percentages
    const hydratedScores = scores.map((c, index, all) => {
      c.division = division;
      if (!c.sd) {
        c.sd = new Date(
          now.getTime() + 1000 * (all.length - index),
        ).toISOString();
      }
      if (c.classifier) {
        c.classifierDivision = [c.classifier, division].join(":");
      }

      const recHHF = recHHFsMap[c.classifierDivision || ""];
      if (recHHF) {
        c.recPercent = (100 * c.hf) / recHHF.recHHF;
        c.curPercent = (100 * c.hf) / recHHF.curHHF;
      } else {
        console.error(`No RecHHF for ${c.classifierDivision}`);
      }
      return c;
    });

    // Fetch existing scores for the shooter
    const existingScores = await findDocuments<Record<string, unknown>>(
      "scores",
      {
        memberNumber,
        division,
        bad: { $ne: true },
        source: { $ne: "Major Match" },
      },
    );

    // Simple what-if calculation (simplified version)
    // The full implementation would use the classification engine
    const recScores = hydratedScores.filter((s) => s.recPercent);
    const avgRecPercent =
      recScores.length > 0
        ? recScores.reduce((sum, s) => sum + (s.recPercent || 0), 0) /
          recScores.length
        : 0;

    return NextResponse.json({
      scoresByDate: recScores.map(({ hf, classifier, recPercent, sd }) => ({
        hf,
        classifier,
        recPercent,
        sd,
      })),
      recHHFsMap,
      whatIf: {
        recPercent: avgRecPercent,
      },
      scores: hydratedScores,
      existingRec: existingScores
        .filter((s) => s.division === division)
        .map(({ hf, classifier }) => ({ hf, classifier })),
    });
  } catch (error) {
    console.error("Error processing what-if analysis:", error);
    return NextResponse.json(
      { error: "Failed to process what-if analysis" },
      { status: 500 },
    );
  }
}
