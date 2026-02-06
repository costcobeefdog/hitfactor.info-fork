import type { CollectionConfig } from "payload";

export const Reports: CollectionConfig = {
  slug: "reports",
  admin: {
    useAsTitle: "memberNumber",
    group: "Admin",
    defaultColumns: ["memberNumber", "classifier", "reason", "done"],
    listSearchableFields: ["memberNumber", "classifier", "reason"],
  },
  access: {
    read: ({ req: { user } }) => user?.role === "admin" || user?.role === "moderator",
    create: () => true, // Anyone can submit a report
    update: ({ req: { user } }) => user?.role === "admin" || user?.role === "moderator",
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    // Score reference info
    {
      name: "sd",
      type: "date",
      admin: { description: "Score date" },
    },
    {
      name: "memberNumber",
      type: "text",
      required: true,
    },
    {
      name: "division",
      type: "text",
    },
    {
      name: "classifier",
      type: "text",
    },
    {
      name: "hf",
      type: "number",
      admin: { description: "Hit factor" },
    },
    {
      name: "recPercent",
      type: "number",
    },
    {
      name: "percent",
      type: "number",
    },

    // Club info
    {
      name: "clubid",
      type: "text",
    },
    {
      name: "club_name",
      type: "text",
    },
    {
      name: "matchName",
      type: "text",
    },

    // Report details
    {
      name: "url",
      type: "text",
      admin: { description: "URL to source/evidence" },
    },
    {
      name: "reason",
      type: "select",
      required: true,
      options: [
        { label: "Wrong Score", value: "wrong_score" },
        { label: "Duplicate", value: "duplicate" },
        { label: "Incorrect Member Number", value: "incorrect_member" },
        { label: "Suspicious", value: "suspicious" },
        { label: "Other", value: "other" },
      ],
    },
    {
      name: "comment",
      type: "textarea",
      admin: { description: "Additional details" },
    },

    // Report type and target
    {
      name: "type",
      type: "select",
      options: [
        { label: "Score", value: "score" },
        { label: "Shooter", value: "shooter" },
        { label: "Match", value: "match" },
      ],
      defaultValue: "score",
    },
    {
      name: "targetId",
      type: "text",
      admin: { description: "ID of the target document" },
    },

    // Status
    {
      name: "done",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "Report has been reviewed/resolved" },
    },
  ],
};
