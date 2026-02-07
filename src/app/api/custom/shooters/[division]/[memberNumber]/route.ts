/**
 * GET /api/custom/shooters/[division]/[memberNumber]
 * Returns shooter info with classifier scores.
 */

import { NextRequest, NextResponse } from "next/server";

import { findDocuments, findOne, aggregate } from "@/lib/mongodb";
import { basicInfoForClassifierCode } from "@/lib/classifiers";

interface Props {
  params: Promise<{ division: string; memberNumber: string }>;
}

const multisortObj = (
  fields: string[] | undefined,
  orders: string[] | undefined,
): Record<string, 1 | -1> =>
  Object.fromEntries(
    (fields || []).map((f, i) => [f, Number(orders?.[i] || 0) > 0 ? 1 : -1]),
  );

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division, memberNumber } = await params;
    const { searchParams } = new URL(request.url);

    const sort = searchParams.get("sort") || undefined;
    const order = searchParams.get("order") || undefined;

    // Fetch shooter info for all divisions and scores in parallel
    const [infos, scoresData] = await Promise.all([
      findDocuments<Record<string, unknown>>("shooters", { memberNumber }),
      aggregate<Record<string, unknown>>("scores", [
        {
          $match: {
            division,
            memberNumber,
            bad: { $ne: true },
            source: { $ne: "Major Match" },
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
            recHHF: {
              $getField: {
                input: { $arrayElemAt: ["$rechhfs", 0] },
                field: "recHHF",
              },
            },
            curHHF: {
              $getField: {
                input: { $arrayElemAt: ["$rechhfs", 0] },
                field: "curHHF",
              },
            },
            oldHHF: {
              $getField: {
                input: { $arrayElemAt: ["$rechhfs", 0] },
                field: "oldHHF",
              },
            },
          },
        },
        {
          $project: {
            rechhfs: false,
          },
        },
        {
          $addFields: {
            recPercent: {
              $cond: {
                if: { $gt: ["$recHHF", 0] },
                then: {
                  $round: [{ $multiply: [{ $divide: ["$hf", "$recHHF"] }, 100] }, 4],
                },
                else: -1,
              },
            },
            curPercent: {
              $cond: {
                if: { $gt: ["$curHHF", 0] },
                then: {
                  $round: [{ $multiply: [{ $divide: ["$hf", "$curHHF"] }, 100] }, 4],
                },
                else: -1,
              },
            },
            oldPercent: {
              $cond: {
                if: { $gt: ["$oldHHF", 0] },
                then: {
                  $round: [{ $multiply: [{ $divide: ["$hf", "$oldHHF"] }, 100] }, 4],
                },
                else: -1,
              },
            },
          },
        },
        { $sort: { sd: -1, hf: -1 } },
      ]),
    ]);

    // Sort the scores if sort params provided
    let sortedScores = scoresData;
    if (sort) {
      const sortFields = sort.split(",");
      const orderFields = order?.split(",") || [];
      const sortObj = multisortObj(sortFields, orderFields);

      sortedScores = [...scoresData].sort((a, b) => {
        for (const [field, direction] of Object.entries(sortObj)) {
          const aVal = a[field];
          const bVal = b[field];
          if (aVal === bVal) continue;

          if (typeof aVal === "string" && typeof bVal === "string") {
            const cmp = aVal.localeCompare(bVal);
            if (cmp !== 0) return cmp * direction;
          } else {
            const aNum = Number(aVal) || 0;
            const bNum = Number(bVal) || 0;
            if (aNum !== bNum) return (aNum - bNum) * direction;
          }
        }
        return 0;
      });
    }

    // Add classifier info and index
    const data = sortedScores.map((c, index) => ({
      ...c,
      classifierInfo: basicInfoForClassifierCode(c.classifier as string) || {},
      hf: division.startsWith("scsa") ? Number(c.stageTimeSecs) : c.hf,
      index,
    }));

    // Handle redirect for bad member numbers
    const dbInfo = infos.find((s) => s.division === division);
    if (!dbInfo && memberNumber.match(/^(A|TY|FY)/)) {
      const memberNumberDigits = memberNumber.replace(/^(A|TY|FY)/, "");
      const alt = await findOne<Record<string, unknown>>("shooters", {
        memberNumber: new RegExp(`${memberNumberDigits}$`),
      });
      if (alt) {
        return NextResponse.json({
          info: {},
          classifiers: [],
          altMemberNumber: alt.memberNumber,
        });
      }
    }

    // Build info object with classification by division
    const info = { ...(dbInfo || {}) } as Record<string, unknown>;
    info.classificationByDivision = infos.reduce(
      (acc, cur) => {
        const {
          reclassificationsRecPercentUncappedCurrent: recCurrent,
          reclassificationsRecPercentUncappedHigh: recHigh,
          reclassificationsMajorsCurrent: majors,
          reclassificationsClassifiersCurrent: classifiers,
        } = cur as Record<string, unknown>;

        acc[cur.division as string] = {
          reclassificationsRecPercentUncappedCurrent: recCurrent || 0,
          reclassificationsRecPercentUncappedHigh: recHigh || 0,
          reclassificationsMajorsCurrent: majors || 0,
          reclassificationsClassifiersCurrent: classifiers || 0,
          age: cur.age,
          age1: cur.age1,
        };
        return acc;
      },
      {} as Record<string, unknown>,
    );

    // Clean up internal fields
    delete info.reclassifications;
    delete info.classes;
    delete info.currents;
    delete info.ages;
    delete info.age1s;

    return NextResponse.json({
      info: info || {},
      classifiers: data,
    });
  } catch (error) {
    console.error("Error fetching shooter info:", error);
    return NextResponse.json(
      { error: "Failed to fetch shooter info" },
      { status: 500 },
    );
  }
}
