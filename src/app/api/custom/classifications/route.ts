/**
 * GET /api/custom/classifications
 * Returns classification statistics.
 */

import { NextResponse } from "next/server";

import { findOne } from "@/lib/mongodb";

export async function GET() {
  try {
    const stats = await findOne("stats", {});
    return NextResponse.json(stats || {});
  } catch (error) {
    console.error("Error fetching classification stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch classification stats" },
      { status: 500 },
    );
  }
}
