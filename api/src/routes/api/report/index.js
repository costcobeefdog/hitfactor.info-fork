import { Reports } from "../../../db/reports";
import { Scores } from "../../../db/scores";

const reportRoutes = async fastify => {
  fastify.get("/", async (req, res) => {
    if (!process.env.ALLOW_MARK_BAD) {
      res.statusCode = 401;
      return { nuhUh: 1 };
    }

    return Reports.find({ done: { $ne: true } });
  });
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
      matchName,
      _id: targetId,
    } = req.body || {};

    const result = await Reports.create({
      sd: sd || new Date(),
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
      matchName,
    });

    return { id: result?._id };
  });

  fastify.post("/ignore", async (req, res) => {
    const { reportId } = req.body || {};
    if (!process.env.ALLOW_MARK_BAD) {
      res.statusCode = 401;
      return { nuhUh: 1 };
    }

    return Reports.updateOne({ _id: reportId }, { $set: { done: true } });
  });

  fastify.post("/bad", async (req, res) => {
    const { memberNumber, division, hf, type, targetId, reportId } = req.body || {};
    if (!process.env.ALLOW_MARK_BAD) {
      res.statusCode = 401;
      return { nuhUh: 1 };
    }

    if (type === "Score") {
      const scoreDbResponse = await Scores.updateOne(
        { memberNumber, division, hf, _id: targetId },
        { $set: { bad: true } },
      );
      const reportDbResponse = reportId
        ? await Reports.updateOne({ _id: reportId }, { $set: { done: true } })
        : null;
      return { scoreDbResponse, targetId, reportDbResponse };
    } else if (type === "Shooter") {
      const scoreDbResponse = await Scores.updateMany(
        { memberNumber },
        { $set: { bad: true } },
      );
      const reportDbResponse = reportId
        ? await Reports.updateOne({ _id: reportId }, { $set: { done: true } })
        : null;
      return { scoreDbResponse, targetId, reportDbResponse };
    }
    res.statusCode(400);
    return { wat: 1 };
  });
};

export default reportRoutes;
