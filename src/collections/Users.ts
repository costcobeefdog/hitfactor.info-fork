import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    tokenExpiration: 7200, // 2 hours
    maxLoginAttempts: 5,
    lockTime: 600 * 1000, // 10 minutes
  },
  admin: {
    useAsTitle: "email",
    group: "Admin",
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Moderator", value: "moderator" },
        { label: "User", value: "user" },
      ],
      defaultValue: "user",
      required: true,
      saveToJWT: true,
    },
    {
      name: "memberNumber",
      type: "text",
      admin: {
        description: "USPSA member number for linking to shooter profile",
      },
    },
  ],
};
