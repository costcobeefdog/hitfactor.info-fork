import type { CollectionConfig } from "payload";

export const Classifiers: CollectionConfig = {
  slug: "classifiers",
  admin: {
    useAsTitle: "classifier",
    group: "Data",
    defaultColumns: ["classifier", "division", "name", "runs"],
    listSearchableFields: ["classifier", "name", "division"],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => user?.role === "admin",
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        if (data && data.classifier && data.division) {
          data.classifierDivision = `${data.classifier}:${data.division}`;
        }
        return data;
      },
    ],
  },
  fields: [
    // Core identification
    {
      name: "classifier",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "division",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "classifierDivision",
      type: "text",
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: "name",
      type: "text",
    },

    // Run statistics
    {
      name: "runs",
      type: "number",
      admin: { description: "Total number of runs" },
    },
    {
      name: "lastYearRuns",
      type: "number",
      admin: { description: "Runs in the last year" },
    },

    // HHF values (stored, lookup from RecHHFs)
    {
      name: "hhf",
      type: "number",
      admin: { description: "Current HHF" },
    },
    {
      name: "prevHHF",
      type: "number",
      admin: { description: "Previous HHF" },
    },

    // Distribution percentiles (rec percent)
    {
      name: "inverse95RecPercentPercentile",
      type: "number",
    },
    {
      name: "inverse85RecPercentPercentile",
      type: "number",
    },
    {
      name: "inverse75RecPercentPercentile",
      type: "number",
    },
    {
      name: "inverse60RecPercentPercentile",
      type: "number",
    },
    {
      name: "inverse40RecPercentPercentile",
      type: "number",
    },

    // Distribution percentiles (cur percent)
    {
      name: "inverse95CurPercentPercentile",
      type: "number",
    },
    {
      name: "inverse85CurPercentPercentile",
      type: "number",
    },
    {
      name: "inverse75CurPercentPercentile",
      type: "number",
    },
    {
      name: "inverse60CurPercentPercentile",
      type: "number",
    },
    {
      name: "inverse40CurPercentPercentile",
      type: "number",
    },

    // Correlation/quality metrics
    {
      name: "eloRuns",
      type: "number",
      admin: { description: "Runs with ELO data" },
    },
    {
      name: "eloCorrelation",
      type: "number",
      admin: { description: "ELO correlation coefficient" },
    },
    {
      name: "majorsRuns",
      type: "number",
      admin: { description: "Runs with majors data" },
    },
    {
      name: "majorsCorrelation",
      type: "number",
      admin: { description: "Majors correlation coefficient" },
    },
    {
      name: "classificationCorrelation",
      type: "number",
      admin: { description: "Classification correlation coefficient" },
    },

    // Run totals by class
    {
      name: "runsTotalsLegitGM",
      type: "number",
    },
    {
      name: "runsTotalsLegitM",
      type: "number",
    },
    {
      name: "runsTotalsLegitA",
      type: "number",
    },
    {
      name: "runsTotalsLegitB",
      type: "number",
    },
    {
      name: "runsTotalsLegitC",
      type: "number",
    },
    {
      name: "runsTotalsLegitD",
      type: "number",
    },
    {
      name: "runsTotalsLegitHundo",
      type: "number",
    },
    {
      name: "runsTotalsLegitTotal",
      type: "number",
    },

    // Club info
    {
      name: "clubsCount",
      type: "number",
    },
    {
      name: "clubs",
      type: "json",
      admin: { description: "Clubs that have run this classifier" },
    },

    // Historical HHF data
    {
      name: "hhfs",
      type: "json",
      admin: { description: "Historical HHF values" },
    },

    // Top percentile stats
    {
      name: "top1PercentilePercent",
      type: "number",
    },
    {
      name: "top1PercentileCurPercent",
      type: "number",
    },
    {
      name: "top1PercentileHF",
      type: "number",
    },
    {
      name: "top2PercentilePercent",
      type: "number",
    },
    {
      name: "top2PercentileCurPercent",
      type: "number",
    },
    {
      name: "top2PercentileHF",
      type: "number",
    },
    {
      name: "top5PercentilePercent",
      type: "number",
    },
    {
      name: "top5PercentileCurPercent",
      type: "number",
    },
    {
      name: "top5PercentileHF",
      type: "number",
    },
    {
      name: "top10CurPercentAvg",
      type: "number",
    },

    // Metadata
    {
      name: "updated",
      type: "date",
    },
  ],
};
