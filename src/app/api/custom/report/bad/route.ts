import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.ALLOW_MARK_BAD) {
    return NextResponse.json({ nuhUh: 1 }, { status: 401 });
  }

  const body = await request.json();
  const { memberNumber, division, hf, type, targetId, reportId } = body || {};

  const payload = await getPayload({ config });

  if (type === "Score") {
    // Update the specific score as bad
    const scoreResult = await payload.update({
      collection: "scores",
      id: targetId,
      data: {
        bad: true,
      },
    });

    // Mark report as done if provided
    let reportResult = null;
    if (reportId) {
      reportResult = await payload.update({
        collection: "reports",
        id: reportId,
        data: {
          done: true,
        },
      });
    }

    return NextResponse.json({
      scoreDbResponse: scoreResult,
      targetId,
      reportDbResponse: reportResult,
    });
  } else if (type === "Shooter") {
    // Update all scores for this member as bad
    // Need to use raw MongoDB for bulk updates
    const db = payload.db;
    const ScoresModel = (db as { collections: Record<string, { Model: unknown }> }).collections[
      "scores"
    ]?.Model as { updateMany: (filter: object, update: object) => Promise<unknown> };

    const scoreDbResponse = await ScoresModel.updateMany(
      { memberNumber },
      { $set: { bad: true } },
    );

    // Mark report as done if provided
    let reportDbResponse = null;
    if (reportId) {
      reportDbResponse = await payload.update({
        collection: "reports",
        id: reportId,
        data: {
          done: true,
        },
      });
    }

    return NextResponse.json({
      scoreDbResponse,
      targetId,
      reportDbResponse,
    });
  }

  return NextResponse.json({ wat: 1 }, { status: 400 });
}
