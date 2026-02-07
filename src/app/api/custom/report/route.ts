import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

export async function GET() {
  // Check authorization
  if (!process.env.ALLOW_MARK_BAD) {
    return NextResponse.json({ nuhUh: 1 }, { status: 401 });
  }

  const payload = await getPayload({ config });

  const reports = await payload.find({
    collection: "reports",
    where: {
      done: { not_equals: true },
    },
    limit: 100,
  });

  return NextResponse.json(reports.docs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    sd,
    memberNumber,
    division,
    classifier,
    hf,
    url,
    reason,
    comment,
    recPercent,
    percent,
    clubid,
    club_name,
    type,
    matchName,
    _id: targetId,
  } = body || {};

  const payload = await getPayload({ config });

  const result = await payload.create({
    collection: "reports",
    data: {
      sd: sd || new Date().toISOString(),
      memberNumber,
      division,
      classifier,
      hf,
      url,
      reason,
      comment,
      recPercent,
      percent,
      clubid,
      club_name,
      type,
      targetId,
      matchName,
    },
  });

  return NextResponse.json({ id: result?.id });
}
