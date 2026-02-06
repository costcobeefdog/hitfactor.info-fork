import path from "path";
import { fileURLToPath } from "url";

import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";

import {
  Classifiers,
  Matches,
  MatchScores,
  RecHHFs,
  Reports,
  Scores,
  Shooters,
  Users,
} from "./collections";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: "users",
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    // Admin
    Users,
    Reports,
    // Data
    Scores,
    Shooters,
    Classifiers,
    RecHHFs,
    Matches,
    MatchScores,
  ],
  db: mongooseAdapter({
    url: process.env.MONGO_URL || "mongodb://localhost:27017/test",
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "development-secret-change-in-production",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
