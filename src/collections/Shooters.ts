import type { CollectionConfig } from "payload";

export const Shooters: CollectionConfig = {
  slug: "shooters",
  dbName: "shooters", // Use existing MongoDB collection
  admin: {
    useAsTitle: "memberNumber",
    group: "Data",
    defaultColumns: ["memberNumber", "name", "division", "class", "hqClass"],
    listSearchableFields: ["memberNumber", "name", "division"],
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
        if (data && data.memberNumber && data.division) {
          data.memberNumberDivision = `${data.memberNumber}:${data.division}`;
        }
        return data;
      },
    ],
  },
  fields: [
    // Core identification
    {
      name: "memberNumber",
      type: "text",
      required: true,
      index: true,
    },
    {
      name: "memberId",
      type: "text",
      index: true,
      admin: { description: "Internal member ID" },
    },
    {
      name: "name",
      type: "text",
    },
    {
      name: "division",
      type: "text",
      required: true,
      index: true,
    },

    // Compound key
    {
      name: "memberNumberDivision",
      type: "text",
      unique: true,
      index: true,
      admin: { readOnly: true },
    },

    // HQ Classification
    {
      name: "class",
      type: "text",
      admin: { description: "Current classification letter" },
    },
    {
      name: "hqClass",
      type: "text",
      admin: { description: "USPSA HQ classification" },
    },
    {
      name: "hqClassRank",
      type: "number",
      admin: { description: "HQ class numeric rank" },
    },

    // Reclassification - Combined (majors + classifiers)
    {
      name: "reclassificationsRecPercentUncappedCurrent",
      type: "number",
      index: true,
      admin: { description: "Current recommended percent (uncapped)" },
    },
    {
      name: "reclassificationsRecPercentUncappedHigh",
      type: "number",
      admin: { description: "High recommended percent (uncapped)" },
    },
    {
      name: "reclassificationsRecPercentHistory",
      type: "json",
      admin: { description: "History of recommended percentages" },
    },

    // Reclassification - Majors only
    {
      name: "reclassificationsMajorsCurrent",
      type: "number",
      index: true,
      admin: { description: "Current percent from majors only" },
    },
    {
      name: "reclassificationsMajorsHistory",
      type: "json",
      admin: { description: "History of majors-only percentages" },
    },

    // Reclassification - Classifiers only
    {
      name: "reclassificationsClassifiersCurrent",
      type: "number",
      index: true,
      admin: { description: "Current percent from classifiers only" },
    },
    {
      name: "reclassificationsClassifiersHistory",
      type: "json",
      admin: { description: "History of classifiers-only percentages" },
    },

    // Computed class fields
    {
      name: "recUncappedClassCurrent",
      type: "text",
      admin: { description: "Current recommended class (uncapped)" },
    },
    {
      name: "recUncappedClassCurrentRank",
      type: "number",
    },
    {
      name: "recUncappedClassHigh",
      type: "text",
      admin: { description: "High recommended class (uncapped)" },
    },
    {
      name: "recUncappedClassHighRank",
      type: "number",
    },

    // Age tracking
    {
      name: "age",
      type: "number",
      admin: { description: "Age of classification data" },
    },
    {
      name: "age1",
      type: "number",
      admin: { description: "Age metric 1" },
    },

    // ELO rating
    {
      name: "elo",
      type: "number",
      admin: { description: "ELO rating" },
    },

    // Current percent (HQ)
    {
      name: "current",
      type: "number",
      admin: { description: "Current HQ percent" },
    },
  ],
};
