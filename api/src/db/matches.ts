/* eslint-disable no-console */
import mongoose, { Model } from "mongoose";

import { MatchDef } from "@api/worker/uploadsCommon";
import { AlgoliaMatchNumericFilters } from "@data/types/Algolia";
import { Match, MatchVirtualsNoRefs } from "@data/types/Match";
import { MatchScore } from "@data/types/MatchScore";
import { matchLevel } from "@shared/utils/matchLevel";

import { getAlgoliaUrl } from "./utils";

interface MatchVirtuals extends MatchVirtualsNoRefs {
  scoresCount: number;
  matchScores: MatchScore[];
  matchScoresCount: number;
  hasMatchScores: boolean;
}

type MatchesModel = Model<Match, object, MatchVirtuals>;

const MatchesSchema = new mongoose.Schema<Match, MatchesModel, MatchVirtuals>(
  {
    updated: Date,
    created: Date,
    id: { type: Number, required: true, unique: true },
    name: String,

    type: String,
    subType: String,
    templateName: String,

    uuid: { type: String, required: true, unique: true },
    date: String,

    fetched: Date,
    uploaded: Date,
  },
  { strict: false },
);
MatchesSchema.index({ id: -1 });
MatchesSchema.index({ fetched: 1, uploaded: 1 });
MatchesSchema.index({ updated: 1, uploaded: 1 });
MatchesSchema.index({ updated: 1 });
MatchesSchema.index({ fetched: 1 });
MatchesSchema.virtual("scoresCount", {
  ref: "Scores",
  localField: "uuid",
  foreignField: "upload",
  count: true,
});
MatchesSchema.virtual("matchScores", {
  ref: "MatchScores",
  localField: "uuid",
  foreignField: "upload",
});
MatchesSchema.virtual("matchScoresCount", {
  ref: "MatchScores",
  localField: "uuid",
  foreignField: "upload",
  count: true,
});
MatchesSchema.virtual("hasMatchScores").get(function () {
  return this.matchScoresCount > 0;
});
MatchesSchema.virtual("level").get(function () {
  return matchLevel(this.name);
});
export const Matches =
  mongoose.models.Matches ||
  mongoose.model<typeof MatchesSchema>("Matches", MatchesSchema);

const MATCHES_PER_FETCH = 1000;
const _idRange = fromId =>
  encodeURIComponent(`id: ${fromId + 1} TO ${fromId + MATCHES_PER_FETCH + 1}`);

const fetchMatchesRange = async (
  fromId,
): Promise<(Match & AlgoliaMatchNumericFilters)[]> => {
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

const matchFromAlgoliaHit = h => ({
  updated: new Date(`${h.updated}Z`),
  created: new Date(`${h.created}Z`),
  id: h.id,
  name: h.match_name,
  uuid: h.match_id,
  date: h.match_date,
  timestamp_utc_updated: h.timestamp_utc_updated,
  type: h.match_type,
  subType: h.match_subtype,
  templateName: h.templateName,
});

export const matchFromMatchDef = (
  h: MatchDef,
  forcedTemplateName?: string,
): Match & AlgoliaMatchNumericFilters => {
  if (!h) {
    return h;
  }
  const updated = new Date(`${h.match_modifieddate}Z`);
  return {
    updated,
    created: new Date(`${h.match_creationdate}Z`),
    id: Number.parseInt(h.match_id.split("-").reverse()[0], 16),
    name: h.match_name,
    uuid: h.match_id,
    date: h.match_date,
    timestamp_utc_updated: updated.getTime(),
    type: h.match_type,
    subType: h.match_subtype,
    templateName: forcedTemplateName || h.templateName,
  };
};

export const fetchMatchesRangeByTimestamp = async (
  latestTimestamp: number,
): Promise<(Match & AlgoliaMatchNumericFilters)[]> => {
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
 * @param startId match id to start with, defaults to 220k, somewhere around May 2024,
 * which was before the USPSA Import Loss.
 */
const fetchMoreMatches = async (startId = 220000, onPageCallback) => {
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
 * @param startDate match updated date to start with
 */
export const fetchMoreMatchesByTimestamp = async (startTimestamp, onPageCallback) => {
  let resultsCount = 0;

  let lastFetchResults: (Match & AlgoliaMatchNumericFilters)[] = [];
  let curTimestamp = 8640_000_000_000_000 / 1000; // max valid js date / 1000 (for algolia, which uses seconds timestamps)
  do {
    lastFetchResults = (await fetchMatchesRangeByTimestamp(curTimestamp)).sort(
      (a, b) => a.timestamp_utc_updated - b.timestamp_utc_updated,
    );
    process.stdout.write(".");
    const earliestFetchedTimestamp = lastFetchResults[0]?.timestamp_utc_updated;
    curTimestamp = earliestFetchedTimestamp || startTimestamp + 1;

    const lastInTheTimeWindowResults = lastFetchResults.filter(
      c => c.timestamp_utc_updated >= startTimestamp,
    );
    resultsCount += lastInTheTimeWindowResults.length;
    await onPageCallback(lastInTheTimeWindowResults);
  } while (curTimestamp > startTimestamp && lastFetchResults.length > 0);

  return resultsCount;
};

/**
 * Fetch loop by id, won't produce updates, since id stays the same, and we're fetching
 * only ids that are higher than the highest one we already have in the database.
 *
 * Saves matches into Matches collecion, which is later used by upload loop.
 *
 * Use for initial fetch of matches, for day-to-day use fetchAndSaveMoreMatchesByUpdateDate
 */
export const fetchAndSaveMoreMatchesById = async () => {
  const lastMatch = await Matches.findOne().sort({ id: -1 });
  console.log(`lastMatchId = ${lastMatch?.id}`);
  return fetchMoreMatches(lastMatch?.id, async matches =>
    Matches.bulkWrite(
      matches.map(m => ({
        updateOne: {
          filter: {
            uuid: m.uuid,
          },
          update: { $set: m },
          upsert: true,
        },
      })),
    ),
  );
};

export const fetchAndSaveMoreMatchesSinceUpdatedDate = async (updatedDate?: Date) => {
  const now = new Date().getTime();
  const startDate = Math.min(updatedDate?.getTime() || now, now);

  // add extra 48 hours window to account for wrong timeZone on upload tablets
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  return fetchMoreMatchesByTimestamp(
    Math.floor((startDate - TWO_DAYS_MS) / 1000),
    async matches =>
      Matches.bulkWrite(
        matches.map(m => ({
          updateOne: {
            filter: {
              uuid: m.uuid,
            },
            update: { $set: m },
            upsert: true,
          },
        })),
      ),
  );
};

/**
 * Same as fetchAndSaveMoreMatchesById, but uses updated date.
 *
 * Should overwrite some matches if they were updated after previous fetch.
 */
export const fetchAndSaveMoreMatchesByUpdatedDate = async () => {
  const lastMatch = await Matches.findOne().sort({ updated: -1 });
  console.log(
    `lastUpdatedMatch= ${lastMatch?.updated?.toLocaleDateString?.("en-us", {
      timeZone: "UTC",
    })}`,
  );

  return fetchAndSaveMoreMatchesSinceUpdatedDate(lastMatch?.updated);
};
