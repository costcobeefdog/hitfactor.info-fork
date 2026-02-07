import { getPayload } from "payload";
import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import algoliasearch from "algoliasearch";

// Import the Algolia key getter from the old API
import { getAlgoliaKey } from "../../../../../../api/src/db/utils";

interface AlgoliaMatch {
  match_date: string;
  updated: string;
  created: string;
  id: number;
  front_club_state: string;
  match_name: string;
  match_id: string;
  templateName: string;
  match_type: string;
  match_subtype: string;
}

const searchMatches = async (q: string) => {
  try {
    const client = algoliasearch(process.env.ALGOLIA_APP_ID!, await getAlgoliaKey());
    const index = client.initIndex("postmatches");
    const { hits } = await index.search<AlgoliaMatch>(q, {
      hitsPerPage: 10,
      filters: "templateName:USPSA",
    });

    return hits
      .map(h => ({
        matchDate: new Date(h.match_date),
        updated: new Date(h.updated),
        created: new Date(h.created),
        id: h.id,
        state: h.front_club_state,
        name: h.match_name,
        uuid: h.match_id,
        templateName: h.templateName,
        type: h.match_type,
        subType: h.match_subtype,
      }))
      .sort((a, b) => b.id - a.id);
  } catch (err) {
    console.error(err);
  }
  return [];
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json([]);
  }

  const algoliaMatches = await searchMatches(q);
  const uuids = algoliaMatches.map(m => m.uuid);

  const payload = await getPayload({ config });

  const foundMatches = await payload.find({
    collection: "matches",
    where: {
      uuid: { in: uuids },
    },
    limit: 100,
  });

  const foundMatchesByUUID = foundMatches.docs.reduce(
    (acc, curFoundMatch) => {
      acc[curFoundMatch.uuid as string] = curFoundMatch;
      return acc;
    },
    {} as Record<string, (typeof foundMatches.docs)[number]>,
  );

  const result = algoliaMatches.map(m => {
    const foundMatch = foundMatchesByUUID[m?.uuid] || ({} as Record<string, unknown>);

    return {
      ...m,
      hasMatchScores: foundMatch.hasMatchScores,
      scoresCount: foundMatch.scoresCount || 0,
      updated: foundMatch.updated || m.updated,
      uploaded: foundMatch.uploaded,
      type: foundMatch.type,
      subType: foundMatch.subType || m.subType,
      templateName: foundMatch.templateName || m.templateName,
    };
  });

  return NextResponse.json(result);
}
