import type { CollectionConfig, CollectionAfterReadHook } from "payload";

// Utility functions (from api/src/dataUtil/numbers.ts)
type Numberish = number | string | null | undefined;

const N = (arg: Numberish, fix = 2): number =>
  Number(parseFloat(arg as string).toFixed(fix));

const Percent = (n: Numberish, total: number, fix?: number): number =>
  N((100.0 * (n as number)) / total, fix);

const PositiveOrMinus1 = (n: number): number => (n >= 0 ? n : -1);

// Simple in-memory cache for HHF lookups to avoid repeated queries
const hhfCache = new Map<string, { curHHF: number; recHHF: number; oldHHF: number }>();
const HHF_CACHE_TTL = 60000; // 1 minute
let lastCacheClear = Date.now();

// afterRead hook to compute virtual fields
const computeVirtualFields: CollectionAfterReadHook = async ({ doc, req }) => {
  if (!doc) return doc;

  // Skip if already computed (prevents double computation)
  if (doc._computed) return doc;

  // Compute isMajor - a score is a "major match" score if it has no classifier
  doc.isMajor = !doc.classifier || doc.source === "Major Match";

  // For major match scores, use the stored percent value directly
  if (doc.isMajor) {
    doc.curPercent = doc.percent ?? -1;
    doc.recPercent = doc.percent ?? -1;
    doc.oldPercent = doc.percent ?? -1;
    doc._computed = true;
    return doc;
  }

  // For classifier scores, we need HHF values to compute percentages
  if (doc.hf !== undefined && doc.hf !== null && doc.classifierDivision) {
    let hhfData = { curHHF: doc.curHHF, recHHF: doc.recHHF, oldHHF: doc.oldHHF };

    // If HHF values aren't stored on the doc, fetch from RecHHFs
    const needsHHFLookup = !doc.curHHF && !doc.recHHF && !doc.oldHHF;

    if (needsHHFLookup && req?.payload) {
      // Clear cache periodically
      if (Date.now() - lastCacheClear > HHF_CACHE_TTL) {
        hhfCache.clear();
        lastCacheClear = Date.now();
      }

      // Check cache first
      const cached = hhfCache.get(doc.classifierDivision);
      if (cached) {
        hhfData = cached;
      } else {
        try {
          const result = await req.payload.find({
            collection: "rechhfs",
            where: { classifierDivision: { equals: doc.classifierDivision } },
            limit: 1,
            depth: 0,
          });

          if (result.docs[0]) {
            hhfData = {
              curHHF: result.docs[0].curHHF ?? 0,
              recHHF: result.docs[0].recHHF ?? 0,
              oldHHF: result.docs[0].oldHHF ?? 0,
            };
            hhfCache.set(doc.classifierDivision, hhfData);
          }
        } catch {
          // If lookup fails, continue with stored/default values
        }
      }
    }

    // Store HHF values on doc for reference
    doc.curHHF = hhfData.curHHF ?? doc.curHHF ?? 0;
    doc.recHHF = hhfData.recHHF ?? doc.recHHF ?? 0;
    doc.oldHHF = hhfData.oldHHF ?? doc.oldHHF ?? 0;

    // Compute percentage fields
    doc.curPercent =
      doc.curHHF > 0 ? PositiveOrMinus1(N(Percent(doc.hf, doc.curHHF, 4), 4)) : -1;
    doc.recPercent =
      doc.recHHF > 0 ? PositiveOrMinus1(N(Percent(doc.hf, doc.recHHF, 4), 4)) : -1;
    doc.oldPercent =
      doc.oldHHF > 0 ? PositiveOrMinus1(N(Percent(doc.hf, doc.oldHHF, 4), 4)) : -1;
  } else {
    doc.curPercent = -1;
    doc.recPercent = -1;
    doc.oldPercent = -1;
  }

  doc._computed = true;
  return doc;
};

export const Scores: CollectionConfig = {
  slug: "scores",
  dbName: "scores", // Use existing MongoDB collection
  admin: {
    useAsTitle: "memberNumber",
    group: "Data",
    defaultColumns: ["memberNumber", "classifier", "division", "hf", "sd"],
    listSearchableFields: ["memberNumber", "classifier", "division"],
  },
  access: {
    read: () => true, // Public read access
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => user?.role === "admin",
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    afterRead: [computeVirtualFields],
    beforeChange: [
      // Set compound keys before saving
      async ({ data }) => {
        if (data) {
          // classifierDivision compound key
          if (data.classifier && data.division) {
            data.classifierDivision = `${data.classifier}:${data.division}`;
          }
          // memberNumberDivision compound key
          if (data.memberNumber && data.division) {
            data.memberNumberDivision = `${data.memberNumber}:${data.division}`;
          }
        }
        return data;
      },
    ],
  },
  fields: [
    // Core identification fields
    {
      name: "memberNumber",
      type: "text",
      required: true,
      index: true,
      admin: {
        description: "Shooter's member number",
      },
    },
    {
      name: "classifier",
      type: "text",
      index: true,
      admin: {
        description: "Classifier code (e.g., '99-11'). Empty for major match scores.",
      },
    },
    {
      name: "division",
      type: "text",
      required: true,
      index: true,
      admin: {
        description: "Division code (e.g., 'co', 'opn', 'prod')",
      },
    },

    // Compound keys (computed in beforeChange hook)
    {
      name: "classifierDivision",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description: "Compound key: classifier:division",
      },
    },
    {
      name: "memberNumberDivision",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description: "Compound key: memberNumber:division",
      },
    },

    // Performance metrics
    {
      name: "hf",
      type: "number",
      required: true,
      admin: {
        description: "Hit Factor achieved",
      },
    },
    {
      name: "percent",
      type: "number",
      admin: {
        description: "Percentage at time of score",
      },
    },

    // HHF reference values (stored, not computed)
    {
      name: "curHHF",
      type: "number",
      admin: {
        description: "Current HHF at time of retrieval",
      },
    },
    {
      name: "recHHF",
      type: "number",
      admin: {
        description: "Recommended HHF",
      },
    },
    {
      name: "oldHHF",
      type: "number",
      admin: {
        description: "Old/legacy HHF",
      },
    },
    {
      name: "hfuHF",
      type: "number",
      admin: {
        description: "HFU (Hit Factor) HHF",
      },
    },

    // Computed fields (populated by afterRead hook, not stored)
    {
      name: "isMajor",
      type: "checkbox",
      admin: {
        readOnly: true,
        description: "True if this is a major match score (no classifier)",
      },
    },
    {
      name: "curPercent",
      type: "number",
      admin: {
        readOnly: true,
        description: "Current percentage (computed from hf/curHHF)",
      },
    },
    {
      name: "recPercent",
      type: "number",
      admin: {
        readOnly: true,
        description: "Recommended percentage (computed from hf/recHHF)",
      },
    },
    {
      name: "oldPercent",
      type: "number",
      admin: {
        readOnly: true,
        description: "Old percentage (computed from hf/oldHHF)",
      },
    },

    // Score details
    {
      name: "code",
      type: "text",
      admin: {
        description: "Score code/identifier",
      },
    },
    {
      name: "source",
      type: "text",
      admin: {
        description: "Source of the score data",
      },
    },
    {
      name: "clubid",
      type: "text",
      admin: {
        description: "Club identifier",
      },
    },
    {
      name: "club_name",
      type: "text",
      admin: {
        description: "Club name",
      },
    },
    {
      name: "clubCode",
      type: "text",
      admin: {
        description: "Club code",
      },
    },

    // Temporal fields
    {
      name: "sd",
      type: "date",
      index: true,
      admin: {
        description: "Score date",
      },
    },
    {
      name: "upload",
      type: "date",
      index: true,
      admin: {
        description: "Upload date",
      },
    },

    // Shooter info at time of score
    {
      name: "firstName",
      type: "text",
    },
    {
      name: "lastName",
      type: "text",
    },
    {
      name: "shooterFullName",
      type: "text",
    },

    // Classification at time of score
    {
      name: "class",
      type: "text",
      admin: {
        description: "Classification letter (GM, M, A, B, C, D, U)",
      },
    },
    {
      name: "curClass",
      type: "text",
      admin: {
        description: "Current classification",
      },
    },
    {
      name: "age",
      type: "text",
      admin: {
        description: "Age category",
      },
    },
    {
      name: "lady",
      type: "checkbox",
      admin: {
        description: "Lady category",
      },
    },
    {
      name: "mil",
      type: "checkbox",
      admin: {
        description: "Military category",
      },
    },
    {
      name: "law",
      type: "checkbox",
      admin: {
        description: "Law enforcement category",
      },
    },
    {
      name: "foreign",
      type: "checkbox",
      admin: {
        description: "Foreign shooter",
      },
    },

    // Match/stage details
    {
      name: "matchName",
      type: "text",
    },
    {
      name: "matchId",
      type: "text",
      index: true,
    },
    {
      name: "matchLevel",
      type: "text",
    },
    {
      name: "templateName",
      type: "text",
    },
    {
      name: "stageName",
      type: "text",
    },
    {
      name: "stageNumber",
      type: "number",
    },

    // Scoring details
    {
      name: "a",
      type: "number",
      admin: { description: "A zone hits" },
    },
    {
      name: "b",
      type: "number",
      admin: { description: "B zone hits" },
    },
    {
      name: "c",
      type: "number",
      admin: { description: "C zone hits" },
    },
    {
      name: "d",
      type: "number",
      admin: { description: "D zone hits" },
    },
    {
      name: "m",
      type: "number",
      admin: { description: "Misses" },
    },
    {
      name: "ns",
      type: "number",
      admin: { description: "No-shoots" },
    },
    {
      name: "npm",
      type: "number",
      admin: { description: "Non-penalty misses" },
    },
    {
      name: "dnf",
      type: "checkbox",
      admin: { description: "Did not finish" },
    },
    {
      name: "dq",
      type: "checkbox",
      admin: { description: "Disqualified" },
    },
    {
      name: "time",
      type: "number",
      admin: { description: "Stage time in seconds" },
    },
    {
      name: "points",
      type: "number",
      admin: { description: "Total points scored" },
    },
    {
      name: "penalties",
      type: "number",
      admin: { description: "Penalty points" },
    },
    {
      name: "penaltyCount",
      type: "number",
      admin: { description: "Number of penalties" },
    },
    {
      name: "procedurals",
      type: "number",
      admin: { description: "Procedural penalties" },
    },

    // Steel Challenge specific
    {
      name: "strings",
      type: "array",
      admin: { description: "String times for steel challenge" },
      fields: [
        {
          name: "time",
          type: "number",
        },
      ],
    },
    {
      name: "stringTimes",
      type: "json",
      admin: { description: "Raw string times data" },
    },
    {
      name: "drops",
      type: "number",
      admin: { description: "Number of dropped strings" },
    },

    // Processing flags
    {
      name: "bad",
      type: "checkbox",
      admin: { description: "Flagged as bad/invalid score" },
    },
    {
      name: "invalidReason",
      type: "text",
      admin: { description: "Reason score is invalid" },
    },
    {
      name: "flagged",
      type: "checkbox",
      admin: { description: "Flagged for review" },
    },
    {
      name: "flagReason",
      type: "text",
      admin: { description: "Reason for flag" },
    },

    // Internal processing
    {
      name: "internalId",
      type: "text",
      admin: { description: "Internal unique identifier" },
    },
    {
      name: "hash",
      type: "text",
      admin: { description: "Hash for deduplication" },
    },

    // SCSA specific
    {
      name: "scsaPeak",
      type: "number",
      admin: { description: "SCSA peak time" },
    },
    {
      name: "scsaAverage",
      type: "number",
      admin: { description: "SCSA average time" },
    },

    // Tracking
    {
      name: "sport",
      type: "text",
      admin: { description: "Sport identifier (uspsa, scsa, hfu, pcsl)" },
    },
    {
      name: "region",
      type: "text",
      admin: { description: "Geographic region" },
    },
    {
      name: "state",
      type: "text",
      admin: { description: "State/province" },
    },
    {
      name: "country",
      type: "text",
      admin: { description: "Country" },
    },

    // Additional metadata
    {
      name: "modified",
      type: "date",
      admin: { description: "Last modified timestamp" },
    },
    {
      name: "originalId",
      type: "text",
      admin: { description: "Original ID from source system" },
    },
    {
      name: "psShooterId",
      type: "text",
      admin: { description: "PractiScore shooter ID" },
    },
  ],
};
