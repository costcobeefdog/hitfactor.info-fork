import { Percent } from "@api/dataUtil/numbers";
import { Scores, uspsaDivisionsPopularity } from "@api/db/scores";

const useStaticDivisionStats = true;

const _divisionsPopularityCached = {};

const TWO_HOURS = 2 * 60 * 60_000;
let _provisional25StatsCachedTime = 0;
let _provisional25StatsCached = null;

const statsRoutes = async fastify => {
  fastify.get("/25series", async () => {
    // invalidate cache every 2 hours
    const now = new Date().getTime();
    if (now - _provisional25StatsCachedTime >= TWO_HOURS) {
      _provisional25StatsCachedTime = now;
      _provisional25StatsCached = null;
    }

    if (!_provisional25StatsCached) {
      _provisional25StatsCached = await Scores.aggregate([
        [
          { $match: { classifier: /25-0\d/, subType: "uspsa", bad: { $ne: true } } },
          {
            $group: {
              _id: {
                classifier: "$classifier",
                division: "$division",
              },
              scores: { $sum: 1 },
            },
          },
          {
            $addFields: {
              classifier: "$_id.classifier",
              division: "$_id.division",
            },
          },
          { $project: { _id: 0 } },
          { $sort: { scores: -1 } },
        ],
      ]);
    }

    return _provisional25StatsCached;
  });

  fastify.get("/divisions", async req => {
    if (useStaticDivisionStats) {
      return { disabled: 1 };
    }
    const year = Number(req.query.year) || 0;
    let data = _divisionsPopularityCached[year];
    if (!data) {
      data = await uspsaDivisionsPopularity(year);
      _divisionsPopularityCached[year] = data;
    }

    const total = data.reduce((acc, cur) => acc + cur.scores, 0);

    const dataWithPercent = data.map(cur => {
      cur.percent = Percent(cur.scores, total);
      return cur;
    });

    return { data: dataWithPercent, total };
  });
};

export default statsRoutes;
