import algoliasearch from "algoliasearch";
import { FastifyInstance } from "fastify";

import { verifyApiKey } from "@api/utils";
import { AlgoliaMatch } from "@data/types/Algolia";

import { matchBumpThresholds } from "../../../../../shared/constants/difficulty";
import { mapDivisions } from "../../../dataUtil/divisions";
import { MatchBumps } from "../../../db/matchBumps";
import { Matches } from "../../../db/matches";
import { matchScoresFor } from "../../../db/matchScores";
import { getAlgoliaKey, getCachedAlgoliaKeyWithMeta } from "../../../db/utils";

const searchMatches = async q => {
  try {
    const client = algoliasearch(process.env.ALGOLIA_APP_ID!, await getAlgoliaKey());
    const index = client.initIndex("postmatches");
    const { hits } = await index.search<AlgoliaMatch>(q, {
      hitsPerPage: 10,
      filters:
        //"templateName:USPSA OR templateName:'Hit Factor' OR templateName:'Steel Challenge'",
        "templateName:USPSA",
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

const uploadRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/:uuid", async (req, res) => {
    const { uuid } = req.params as Record<string, string>;
    const m = await Matches.findOne({ uuid }).populate([
      { path: "matchScores", populate: { path: "shooter" } },
    ]);
    if (!m) {
      res.code(404);
      return { error: "Match Not Found" };
    }
    const result = m.toObject({ virtuals: true });

    return {
      ...result,
      uuid,
    };
  });

  fastify.get("/matchBumpMatches", async () => {
    const eligibleMatches = await MatchBumps.find({
      filteredDataPoints: { $gte: matchBumpThresholds.filteredDataPoints },
      filteredCorrelation: { $gte: matchBumpThresholds.filteredCorrelation },
    })
      .limit(0)
      .select(["upload", "division"])
      .lean();
    const uuidsToDivisionMap = eligibleMatches.reduce((acc, cur) => {
      (acc[cur.upload] ??= []).push(cur.division);
      return acc;
    }, {});
    const uuids = Object.keys(uuidsToDivisionMap);

    const matches = await Matches.find({ uuid: { $in: uuids } })
      .limit(0)
      .select(["uuid", "name", "created", "updated", "date"])
      .sort({ created: 1 });

    return matches.map(c => {
      const m = c.toObject({ virtuals: true });
      return {
        ...m,
        ...mapDivisions(div => uuidsToDivisionMap[m.uuid]?.includes(div)),
      };
    });
  });

  fastify.get("/matchScores", async (req, res) => {
    const { division, memberNumber, match } = req.query as Record<string, string>;

    if (!division || (!memberNumber && !match)) {
      res.code(400);
      return { error: "Must provide Division and Member Number or Match UUID" };
    }

    return matchScoresFor({ division, memberNumber, match });
  });

  fastify.get("/searchMatches", async req => {
    const { q } = req.query as Record<string, string>;
    const algoliaMatches = await searchMatches(q);
    const uuids = algoliaMatches.map(m => m.uuid);

    const foundMatches = await Matches.find({ uuid: { $in: uuids } }).populate([
      "scoresCount",
      "matchScoresCount",
    ]);
    const foundMatchesByUUID = foundMatches.reduce(
      (acc, curFoundMatch) => {
        acc[curFoundMatch.uuid] = curFoundMatch;
        return acc;
      },
      {} as Record<string, (typeof foundMatches)[number]>,
    );

    return algoliaMatches.map(m => {
      const foundMatch = foundMatchesByUUID[m?.uuid] || {};

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
  });
};

export default uploadRoutes;
