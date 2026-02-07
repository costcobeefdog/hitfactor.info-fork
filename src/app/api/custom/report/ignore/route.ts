import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!process.env.ALLOW_MARK_BAD) {
    return NextResponse.json({ nuhUh: 1 }, { status: 401 });
  }

  const body = await request.json();
  const { reportId } = body || {};

  const payload = await getPayload({ config });

  const result = await payload.update({
    collection: "reports",
    id: reportId,
    data: {
      done: true,
    },
  });

  return NextResponse.json({ success: true, id: result?.id });
}
