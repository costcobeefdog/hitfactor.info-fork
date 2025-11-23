import { FastifyInstance } from "fastify";

import { verifyApiKey } from "@api/utils";

import { getCachedAlgoliaKeyWithMeta } from "../../../db/utils";

const keyRoutes = async (fastify: FastifyInstance) => {
  fastify.get("/:key", verifyApiKey, async (req, res) => {
    const { key } = req.params as Record<string, string>;

    switch (key) {
      case "algolia": {
        return getCachedAlgoliaKeyWithMeta();
      }
    }

    res.code(404);
    return { error: "Not Found" };
  });
};

export default keyRoutes;
