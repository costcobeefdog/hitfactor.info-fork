/**
 * Matches Loop Script - Payload Local API Version
 *
 * Fetches new and updated matches from Algolia and saves them to the database.
 * This is the Payload-compatible version of scripts/upload/matchesLoop.ts
 *
 * Usage: npx tsx src/scripts/upload/matchesLoop.ts
 */

/* eslint-disable no-console */

import {
  initPayload,
  bulkWrite,
  findOne,
  shutdown,
} from "../../lib/payload-local";

// Import the Algolia fetching utilities from the original API
// These don't need to change as they don't interact with the database
import { getAlgoliaUrl } from "../../../api/src/db/utils";
import { matchLevel } from "../../../shared/utils/matchLevel";

interface Match {
  id: number;
  uuid: string;
  name: string;
  date: string;
  updated: Date;
  created: Date;
  type: string;
  subType: string;
  templateName: string;
  timestamp_utc_updated?: number;
  fetched?: Date;
  uploaded?: Date;
}

const MATCHES_PER_FETCH = 1000;

const _idRange = (fromId: number) =>
  encodeURIComponent(`id: ${fromId + 1} TO ${fromId + MATCHES_PER_FETCH + 1}`);

const matchFromAlgoliaHit = (h: Record<string, unknown>): Match => ({
  updated: new Date(`${h.updated}Z`),
  created: new Date(`${h.created}Z`),
  id: h.id as number,
  name: h.match_name as string,
  uuid: h.match_id as string,
  date: h.match_date as string,
  timestamp_utc_updated: h.timestamp_utc_updated as number,
  type: h.match_type as string,
  subType: h.match_subtype as string,
  templateName: h.templateName as string,
});

const fetchMatchesRange = async (fromId: number): Promise<Match[]> => {
  console.log(`fetching from ${fromId}`);
  const {
    results: [{ hits }],
  } = await (
    await fetch(await getAlgoliaUrl(), {
      body: JSON.stringify({
        requests: [
          {
            indexName: "postmatches",
            params: `hitsPerPage=${MATCHES_PER_FETCH}&query=&numericFilters=${_idRange(
              fromId,
            )}`,
          },
        ],
      }),
      method: "POST",
    })
  ).json();

  return hits.map(matchFromAlgoliaHit);
};

const fetchMatchesRangeByTimestamp = async (
  latestTimestamp: number,
): Promise<Match[]> => {
  console.log(`fetching up until ${latestTimestamp}`);
  const {
    results: [{ hits }],
  } = await (
    await fetch(await getAlgoliaUrl(), {
      body: JSON.stringify({
        requests: [
          {
            indexName: "postmatches",
            params: `hitsPerPage=${MATCHES_PER_FETCH}&query=&numericFilters=${encodeURIComponent(
              `timestamp_utc_updated < ${latestTimestamp}`,
            )}`,
          },
        ],
      }),
      method: "POST",
    })
  ).json();

  return hits.map(matchFromAlgoliaHit);
};

/**
 * Fetch more matches by ID and save them to the database.
 */
const fetchMoreMatches = async (
  startId: number,
  onPageCallback: (matches: Match[]) => Promise<void>,
) => {
  let resultsCount = 0;
  let lastResults: Match[] = [];
  let curId = startId;

  do {
    lastResults = (await fetchMatchesRange(curId)).sort((a, b) => b.id - a.id);
    process.stdout.write(".");

    curId = lastResults[0]?.id || Number.MAX_SAFE_INTEGER;

    resultsCount += lastResults.length;
    await onPageCallback(lastResults);
  } while (lastResults.length > 0);

  return resultsCount;
};

/**
 * Fetch more matches by timestamp and save them to the database.
 */
const fetchMoreMatchesByTimestamp = async (
  startTimestamp: number,
  onPageCallback: (matches: Match[]) => Promise<void>,
) => {
  let resultsCount = 0;
  let lastFetchResults: Match[] = [];
  let curTimestamp = 8640_000_000_000_000 / 1000; // max valid js date / 1000

  do {
    lastFetchResults = (await fetchMatchesRangeByTimestamp(curTimestamp)).sort(
      (a, b) =>
        (a.timestamp_utc_updated || 0) - (b.timestamp_utc_updated || 0),
    );
    process.stdout.write(".");

    const earliestFetchedTimestamp = lastFetchResults[0]?.timestamp_utc_updated;
    curTimestamp = earliestFetchedTimestamp || startTimestamp + 1;

    const lastInTheTimeWindowResults = lastFetchResults.filter(
      (c) => (c.timestamp_utc_updated || 0) >= startTimestamp,
    );
    resultsCount += lastInTheTimeWindowResults.length;
    await onPageCallback(lastInTheTimeWindowResults);
  } while (curTimestamp > startTimestamp && lastFetchResults.length > 0);

  return resultsCount;
};

/**
 * Save matches to the database using bulk upsert.
 */
const saveMatches = async (matches: Match[]) => {
  if (matches.length === 0) return;

  await bulkWrite(
    "matches",
    matches.map((m) => ({
      updateOne: {
        filter: { uuid: m.uuid },
        update: { $set: { ...m, fetched: new Date() } },
        upsert: true,
      },
    })),
  );
};

/**
 * Fetch and save new matches by ID.
 */
export const fetchAndSaveMoreMatchesById = async () => {
  const lastMatch = await findOne<Match>("matches", {}, );
  // Get the match with highest ID
  const matches = await findOne<Match[]>("matches", {});

  // Use aggregation to find max ID
  const { aggregate } = await import("../../lib/payload-local");
  const result = await aggregate<{ maxId: number }>("matches", [
    { $group: { _id: null, maxId: { $max: "$id" } } },
  ]);

  const lastMatchId = result[0]?.maxId || 220000;
  console.log(`lastMatchId = ${lastMatchId}`);

  return fetchMoreMatches(lastMatchId, saveMatches);
};

/**
 * Fetch and save matches that have been updated since a given date.
 */
export const fetchAndSaveMoreMatchesSinceUpdatedDate = async (
  updatedDate?: Date,
) => {
  const now = new Date().getTime();
  const startDate = Math.min(updatedDate?.getTime() || now, now);

  // Add extra 48 hours window to account for wrong timeZone on upload tablets
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  return fetchMoreMatchesByTimestamp(
    Math.floor((startDate - TWO_DAYS_MS) / 1000),
    saveMatches,
  );
};

/**
 * Fetch and save matches by updated date.
 */
export const fetchAndSaveMoreMatchesByUpdatedDate = async () => {
  const { aggregate } = await import("../../lib/payload-local");
  const result = await aggregate<{ maxUpdated: Date }>("matches", [
    { $group: { _id: null, maxUpdated: { $max: "$updated" } } },
  ]);

  const lastUpdatedDate = result[0]?.maxUpdated;
  console.log(
    `lastUpdatedMatch = ${lastUpdatedDate?.toLocaleDateString?.("en-us", {
      timeZone: "UTC",
    })}`,
  );

  return fetchAndSaveMoreMatchesSinceUpdatedDate(lastUpdatedDate);
};

/**
 * Main entry point.
 */
export const matchesLoop = async () => {
  await initPayload();

  const numberOfNewMatches = await fetchAndSaveMoreMatchesById();
  const numberOfUpdatedMatches = await fetchAndSaveMoreMatchesByUpdatedDate();

  console.log(`\nfetched ${numberOfNewMatches} new matches`);
  console.log(`fetched ${numberOfUpdatedMatches} updated matches`);

  await shutdown();
};

// Run if executed directly
matchesLoop();
