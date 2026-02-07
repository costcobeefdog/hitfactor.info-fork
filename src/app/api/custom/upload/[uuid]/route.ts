import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;

  const payload = await getPayload({ config });

  const matches = await payload.find({
    collection: "matches",
    where: {
      uuid: { equals: uuid },
    },
    limit: 1,
  });

  if (matches.docs.length === 0) {
    return NextResponse.json({ error: "Match Not Found" }, { status: 404 });
  }

  const match = matches.docs[0];

  return NextResponse.json({
    ...match,
    uuid,
  });
}
