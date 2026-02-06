import type { CollectionConfig } from "payload";

export const RecHHFs: CollectionConfig = {
  slug: "rechhfs",
  admin: {
    useAsTitle: "classifierDivision",
    group: "Data",
    defaultColumns: ["classifier", "division", "curHHF", "recHHF"],
    listSearchableFields: ["classifier", "division", "classifierDivision"],
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

    // HHF values
    {
      name: "oldHHF",
      type: "number",
      admin: { description: "Legacy/old HHF" },
    },
    {
      name: "curHHF",
      type: "number",
      admin: { description: "Current USPSA HQ HHF" },
    },
    {
      name: "recHHF",
      type: "number",
      admin: { description: "Recommended HHF" },
    },

    // Weibull distribution parameters
    {
      name: "k",
      type: "number",
      admin: { description: "Weibull shape parameter (k)" },
    },
    {
      name: "lambda",
      type: "number",
      admin: { description: "Weibull scale parameter (lambda)" },
    },

    // Weibull-derived HHF estimates
    {
      name: "wbl1HHF",
      type: "number",
      admin: { description: "Weibull 1% HHF estimate" },
    },
    {
      name: "wbl3HHF",
      type: "number",
      admin: { description: "Weibull 3% HHF estimate" },
    },
    {
      name: "wbl5HHF",
      type: "number",
      admin: { description: "Weibull 5% HHF estimate" },
    },
    {
      name: "wbl15HHF",
      type: "number",
      admin: { description: "Weibull 15% HHF estimate" },
    },

    // Distribution shape metrics
    {
      name: "kurtosis",
      type: "number",
    },
    {
      name: "skewness",
      type: "number",
    },

    // Error metrics
    {
      name: "meanSquaredError",
      type: "number",
    },
    {
      name: "meanAbsoluteError",
      type: "number",
    },
    {
      name: "superMeanSquaredError",
      type: "number",
    },
    {
      name: "superMeanAbsoluteError",
      type: "number",
    },
    {
      name: "maxError",
      type: "number",
    },

    // Division-specific extras (for comparison)
    {
      name: "prod10HHF",
      type: "number",
      admin: { description: "Production 10-round HHF" },
    },
    {
      name: "prod10MajorHHF",
      type: "number",
      admin: { description: "Production 10-round major HHF" },
    },
    {
      name: "prod15HHF",
      type: "number",
      admin: { description: "Production 15-round HHF" },
    },
    {
      name: "loHHF",
      type: "number",
      admin: { description: "Limited Optics HHF" },
    },
    {
      name: "locoHHF",
      type: "number",
      admin: { description: "LO+CO combined HHF" },
    },
    {
      name: "locoMajorHHF",
      type: "number",
      admin: { description: "LO+CO major HHF" },
    },
    {
      name: "coHHF",
      type: "number",
      admin: { description: "Carry Optics HHF" },
    },
    {
      name: "opnHHF",
      type: "number",
      admin: { description: "Open HHF" },
    },
    {
      name: "ltdHHF",
      type: "number",
      admin: { description: "Limited HHF" },
    },
    {
      name: "schizoHHF",
      type: "number",
      admin: { description: "Schizo HHF (L10)" },
    },
    {
      name: "prophecyHHF",
      type: "number",
      admin: { description: "Prophecy HHF (L10)" },
    },
  ],
};
