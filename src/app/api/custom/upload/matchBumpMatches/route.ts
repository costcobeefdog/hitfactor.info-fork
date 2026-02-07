import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

import { matchBumpThresholds } from "../../../../../../shared/constants/difficulty";
import { mapDivisions } from "../../../../../../api/src/dataUtil/divisions";
import { MatchBumps } from "../../../../../../api/src/db/matchBumps";

export async function GET() {
  const payload = await getPayload({ config });

  // Get eligible match bumps using the old mongoose model
  const eligibleMatchBumps = await MatchBumps.find({
    filteredDataPoints: { $gte: matchBumpThresholds.filteredDataPoints },
    filteredCorrelation: { $gte: matchBumpThresholds.filteredCorrelation },
  })
    .limit(0)
    .select(["upload", "division"])
    .lean();

  const uuidsToDivisionMap = eligibleMatchBumps.reduce(
    (acc, cur) => {
      const upload = cur.upload as string;
      const division = cur.division as string;
      (acc[upload] ??= []).push(division);
      return acc;
    },
    {} as Record<string, string[]>,
  );
  const uuids = Object.keys(uuidsToDivisionMap);

  if (uuids.length === 0) {
    return NextResponse.json([]);
  }

  // Get matches for those UUIDs
  const matches = await payload.find({
    collection: "matches",
    where: {
      uuid: { in: uuids },
    },
    limit: 0,
    sort: "created",
  });

  const result = matches.docs.map(m => {
    const uuid = m.uuid as string;
    return {
      ...m,
      ...mapDivisions((div: string) => uuidsToDivisionMap[uuid]?.includes(div)),
    };
  });

  return NextResponse.json(result);
}
