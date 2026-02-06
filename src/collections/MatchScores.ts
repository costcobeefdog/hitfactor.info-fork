import type { CollectionConfig } from "payload";

export const MatchScores: CollectionConfig = {
  slug: "matchscores",
  admin: {
    useAsTitle: "memberNumber",
    group: "Data",
    defaultColumns: ["memberNumber", "division", "matchPercent", "date"],
    listSearchableFields: ["memberNumber", "division", "upload"],
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
        if (data) {
          if (data.memberNumber && data.division) {
            data.memberNumberDivision = `${data.memberNumber}:${data.division}`;
          }
          if (data.upload && data.division) {
            data.uploadDivision = `${data.upload}:${data.division}`;
          }
        }
        return data;
      },
    ],
  },
  fields: [
    // Core identification
    {
      name: "upload",
      type: "text",
      required: true,
      index: true,
      admin: { description: "Match UUID" },
    },
    {
      name: "division",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "uploadDivision",
      type: "text",
      index: true,
      admin: { readOnly: true, description: "Compound: upload:division" },
    },

    // Shooter info
    {
      name: "memberNumber",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "originalMemberNumber",
      type: "text",
      admin: { description: "Original member number before normalization" },
    },
    {
      name: "memberNumberDivision",
      type: "text",
      index: true,
      admin: { readOnly: true },
    },
    {
      name: "shooterFullName",
      type: "text",
    },

    // Match date
    {
      name: "date",
      type: "date",
      required: true,
    },

    // Performance metrics
    {
      name: "matchPercent",
      type: "number",
      admin: { description: "Match percentage" },
    },
    {
      name: "percentOfPossible",
      type: "number",
      admin: { description: "Percent of possible points" },
    },

    // Historical shooter classification at time of match (combined)
    {
      name: "shooterRecPercentHistorical",
      type: "number",
      admin: { description: "Shooter rec percent at time of match" },
    },
    {
      name: "shooterRecPercentHistoricalHigh",
      type: "number",
    },
    {
      name: "shooterRecPercentHistoricalAge",
      type: "number",
    },

    // Historical shooter classification (majors only)
    {
      name: "shooterMajorsPercentHistorical",
      type: "number",
    },
    {
      name: "shooterMajorsPercentHistoricalHigh",
      type: "number",
    },
    {
      name: "shooterMajorsPercentHistoricalAge",
      type: "number",
    },

    // Historical shooter classification (classifiers only)
    {
      name: "shooterClassifiersPercentHistorical",
      type: "number",
    },
    {
      name: "shooterClassifiersPercentHistoricalHigh",
      type: "number",
    },
    {
      name: "shooterClassifiersPercentHistoricalAge",
      type: "number",
    },
  ],
};
