/**
 * GET /api/custom/classifiers
 * Returns basic info for all classifiers.
 */

import { NextResponse } from "next/server";

import { basicInfoForClassifier, classifiers } from "@/lib/classifiers";

export async function GET() {
  try {
    const result = classifiers.map(basicInfoForClassifier);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching classifiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch classifiers" },
      { status: 500 },
    );
  }
}
