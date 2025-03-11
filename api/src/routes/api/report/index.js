import { Reports } from "../../../db/reports";
import { Scores } from "../../../db/scores";

const reportRoutes = async fastify => {
  fastify.post("/", async req => {
    const {
      sd,
      memberNumber,
      division,
      classifier,
      hf,
      url,
      reason,
      comment,
      recPercent,
      percent,
      clubid,
      club_name,
      type,
      _id: targetId,
    } = req.body || {};

    const result = await Reports.create({
      sd,
      memberNumber,
      division,
      classifier,
      hf,
      url,
      reason,
      comment,
      recPercent,
      percent,
      clubid,
      club_name,
      type,
      targetId,
    });

    return { id: result?._id };
  });

  fastify.post("/bad", async (req, res) => {
    const { memberNumber, division, hf, type, _id: targetId } = req.body || {};
    if (!process.env.ALLOW_MARK_BAD) {
      res.statusCode = 401;
      return { nuhUh: 1 };
    }

    if (type === "Score") {
      const dbResponse = await Scores.updateOne(
        { memberNumber, division, hf, _id: targetId },
        { $set: { bad: true } },
      );
      return { ...dbResponse, targetId };
    } else if (type === "Shooter") {
      const dbResponse = await Scores.updateMany(
        { memberNumber },
        { $set: { bad: true } },
      );
      return { ...dbResponse, targetId };
    }
    res.statusCode(400);
    return { wat: 1 };
  });
};

export default reportRoutes;
