import type { CollectionConfig } from "payload";

export const Matches: CollectionConfig = {
  slug: "matches",
  admin: {
    useAsTitle: "name",
    group: "Data",
    defaultColumns: ["name", "date", "type", "id"],
    listSearchableFields: ["name", "uuid", "id"],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user } }) => user?.role === "admin",
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    // Core identification
    {
      name: "id",
      type: "number",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "uuid",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { description: "PractiScore match UUID" },
    },
    {
      name: "name",
      type: "text",
    },

    // Match type info
    {
      name: "type",
      type: "text",
      admin: { description: "Match type (e.g., uspsa_p)" },
    },
    {
      name: "subType",
      type: "text",
      admin: { description: "Match subtype" },
    },
    {
      name: "templateName",
      type: "text",
      admin: { description: "Template name" },
    },

    // Dates
    {
      name: "date",
      type: "text",
      admin: { description: "Match date string" },
    },
    {
      name: "updated",
      type: "date",
      index: true,
      admin: { description: "Last updated timestamp" },
    },
    {
      name: "created",
      type: "date",
      admin: { description: "Creation timestamp" },
    },

    // Processing timestamps
    {
      name: "fetched",
      type: "date",
      index: true,
      admin: { description: "When match metadata was fetched" },
    },
    {
      name: "uploaded",
      type: "date",
      index: true,
      admin: { description: "When scores were processed/uploaded" },
    },
  ],
};
