/**
 * GET /api/custom/classifiers/[division]
 * Returns classifiers for a specific division with DB data.
 */

import { NextRequest, NextResponse } from "next/server";

import { aggregate, findDocuments } from "@/lib/mongodb";
import { scsaHhfToPeakTime } from "@/lib/classifiers";

// 2025 active classifiers list
const uspsaClassifiers2025 = [
  "99-02",
  "99-07",
  "99-11",
  "99-14",
  "99-22",
  "99-40",
  "99-47",
  "99-51",
  "99-57",
  "03-02",
  "03-09",
  "06-02",
  "06-03",
  "09-02",
  "09-07",
  "13-01",
  "13-05",
  "18-01",
  "18-03",
  "18-04",
  "18-05",
  "22-01",
  "22-02",
  "22-04",
  "22-05",
  "22-06",
  "22-07",
  "23-01",
  "23-02",
  "24-01",
  "24-02",
  "24-04",
  "24-06",
  "24-08",
  "24-09",
  "25-01",
  "25-02",
  "25-03",
  "25-04",
  "25-05",
  "25-06",
  "25-07",
  "25-08",
];

interface Props {
  params: Promise<{ division: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division } = await params;

    // Find classifiers for this division
    const classifiersFromDB = await findDocuments<Record<string, unknown>>(
      "classifiers",
      {
        division,
        classifier: { $in: uspsaClassifiers2025 },
      },
    );

    // Get RecHHF data for these classifiers
    const classifierDivisions = classifiersFromDB.map(
      (c) => `${c.classifier}:${division}`,
    );
    const recHHFs = await findDocuments<Record<string, unknown>>("rechhfs", {
      classifierDivision: { $in: classifierDivisions },
    });

    // Create a lookup map
    const recHHFMap = new Map(
      recHHFs.map((r) => [r.classifierDivision, r]),
    );

    // Merge data
    const result = classifiersFromDB.map((c) => {
      const recHHF = recHHFMap.get(`${c.classifier}:${division}`);
      const cur = {
        ...c,
        recHHF: recHHF?.recHHF ?? 0,
        curHHF: recHHF?.curHHF ?? 0,
        oldHHF: recHHF?.oldHHF ?? 0,
        hhf: c.hhf ?? 0,
      };

      // Convert HHF to peak time for SCSA divisions
      if (division.startsWith("scsa") && typeof c.classifier === "string") {
        cur.recHHF = scsaHhfToPeakTime(c.classifier, cur.recHHF as number);
        cur.hhf = scsaHhfToPeakTime(c.classifier, cur.hhf as number);
      }

      return cur;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching classifiers for division:", error);
    return NextResponse.json(
      { error: "Failed to fetch classifiers" },
      { status: 500 },
    );
  }
}
