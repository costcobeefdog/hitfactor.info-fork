/**
 * GET /api/custom/shooters/[division]/chart
 * Returns chart data for a division (all shooters).
 */

import { NextRequest, NextResponse } from "next/server";

import { findDocuments } from "@/lib/mongodb";

interface Props {
  params: Promise<{ division: string }>;
}

const safeNumSort =
  (field: string, options?: { allowNegatives?: boolean }) =>
  (a: Record<string, unknown>, b: Record<string, unknown>) => {
    const aValue = a[field];
    const bValue = b[field];
    return (
      Math.max(
        options?.allowNegatives ? Number.NEGATIVE_INFINITY : 0,
        (bValue as number) || 0,
      ) -
      Math.max(
        options?.allowNegatives ? Number.NEGATIVE_INFINITY : 0,
        (aValue as number) || 0,
      )
    );
  };

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division } = await params;
    const { searchParams } = new URL(request.url);

    const xMode = searchParams.get("xMode") || "recPercentUncapped";
    const colorMode = searchParams.get("colorMode") || "current";
    const mode = searchParams.get("mode");

    const shootersTable = await findDocuments<Record<string, unknown>>(
      "shooters",
      {
        division,
        reclassificationsRecPercentUncappedCurrent: { $gt: 0 },
      },
    );

    const mapped = shootersTable.map((c) => ({
      recPercentUncapped: c.reclassificationsRecPercentUncappedCurrent,
      recPercentUncappedHigh: c.reclassificationsRecPercentUncappedHigh,
      majors: c.reclassificationsMajorsCurrent,
      classifiers: c.reclassificationsClassifiersCurrent,
      memberNumber: c.memberNumber,
      current: c.current,
      high: c.high,
    }));

    if (mode === "elo") {
      return NextResponse.json(mapped);
    }

    const result = mapped
      .filter(
        (c) =>
          c[xMode as keyof typeof c] !== undefined &&
          c[colorMode as keyof typeof c] !== undefined,
      )
      .sort(safeNumSort(xMode))
      .map((c, i, all) => ({
        ...c,
        x: c[xMode as keyof typeof c],
        y: (100 * i) / (all.length - 1),
      }))
      .filter((c) => (c.y as number) > 0 && (c.x as number) > 0);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching division chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 },
    );
  }
}
