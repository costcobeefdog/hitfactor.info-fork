import { chromium } from "playwright";

import { PAGE_SIZE } from "../../../shared/constants/pagination";
import { multisortObj } from "../../../shared/utils/sort";
import { escapeRegExp } from "../utils";

interface AlgoliaKeyMeta {
  appId: string;
  apiKey: string;
  validUntil: number;
  serverTime: number;
  success: boolean;
}
interface AlgoliaKeyMetaProcessed extends AlgoliaKeyMeta {
  ttlSeconds: number;
  lagSeconds: number;
  refetchAfter: number;
  safeTTLSeconds: number;
}

export const getAlgoliaKeyWithMeta = async (): Promise<AlgoliaKeyMetaProcessed> => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const apiResponse = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timeout waiting for API response")),
      150_000,
    );

    const listener = async response => {
      if (response.url().includes("/api/v1/search/key") && response.status() === 200) {
        clearTimeout(timeout);
        page.off("response", listener);
        const json = await response.json();
        resolve(json);
      }
    };

    page.on("response", listener);
  });

  const now = new Date().getTime();
  await page.goto("https://practiscore.com/results?query=SLPSA", {
    waitUntil: "domcontentloaded",
  });
  await page.getByText("SLPSA USPSA").first().waitFor({ timeout: 30000 });
  const result = (await apiResponse) as AlgoliaKeyMeta;
  await browser.close();

  const ttlSeconds = result.validUntil - result.serverTime;
  const lagSeconds = result.serverTime - now / 1000;
  const refetchAfter = now + (ttlSeconds * 1000 - 10 * lagSeconds) / 1.5;
  const safeTTLSeconds = Math.floor((refetchAfter - now) / 1000);

  return {
    ...result,
    ttlSeconds,
    lagSeconds,
    refetchAfter,
    safeTTLSeconds,
  };
};

let _cachedAlgoliaKeyMeta: AlgoliaKeyMetaProcessed | null = null;
export const getAlgoliaKey = async () => {
  const expired = new Date().getTime() >= (_cachedAlgoliaKeyMeta?.refetchAfter ?? 0);
  if (!expired && _cachedAlgoliaKeyMeta?.apiKey) {
    return _cachedAlgoliaKeyMeta.apiKey;
  }

  _cachedAlgoliaKeyMeta = await getAlgoliaKeyWithMeta();
  return _cachedAlgoliaKeyMeta.apiKey;
};

export const getAlgoliaUrl = async () => {
  const key = await getAlgoliaKey();
  const algoliaUrl = process.env.ALGOLIA_URL!;
  return (
    algoliaUrl.substring(0, algoliaUrl.lastIndexOf("&x-algolia-api-key=") + 19) + key
  );
};

export const percentAggregationOp = (
  value,
  total,
  round = 2,
  negativeTotalValue = 0,
) => ({
  $cond: {
    if: { $gt: [total, 0] },
    then: {
      $round: [
        {
          $multiply: [{ $divide: [value, total] }, 100],
        },
        round,
      ],
    },
    else: negativeTotalValue,
  },
});

/**
 * Final step aggregation for classifier runs and shooters.
 * Accepts other final aggregations as it's param, in order to avoid OOM query errors in mongo.
 *
 * Sorts by placeByField, and calculates extra fields for each doc returned by the query:
 *  - "place" - index + 1 in current sort mode, before applying filtersAggregation or paginationAggregation
 *  - "total" - total number of docs before applying filtersAggregation,
 *  - "totalWithFilters" - total number of docs after aplying filtersAggregation, but before paginationAggregation
 *  - "percentile" - percentile, determined by "place" and "total" fields
 *
 * @param {string} placeByField  - field to pre-sort and determine place by
 * @param {array} filtersAggregation - aggregation that applies filters
 * @param {*} paginationAggregation - final aggregation that applies sort, skip(page) and limit at the end of aggregation
 * @returns {array} aggregation array, that should be spread at the end of Collection.aggregate() arg
 */
export const addPlaceAndPercentileAggregation = (
  placeByField,
  filtersAggregation,
  paginationAggregation,
  hackMode: "normal" | "tooManyDocs" = "normal",
) => [
  {
    $facet: {
      docs: [
        { $sort: { [placeByField]: -1 } },
        ...(hackMode === "tooManyDocs"
          ? [...filtersAggregation, ...paginationAggregation]
          : []),
      ],
      meta: [{ $count: "total" }],
      metaWithFilters: [...filtersAggregation, { $count: "total" }],
    },
  },
  { $unwind: "$meta" },
  { $unwind: "$metaWithFilters" },
  { $unwind: { path: "$docs", includeArrayIndex: "place" } },
  {
    $addFields: {
      "docs.total": "$meta.total",
      "docs.totalWithFilters": "$metaWithFilters.total",
      "docs.place": "$place",
    },
  },
  { $replaceRoot: { newRoot: "$docs" } },
  {
    $addFields: {
      percentile: percentAggregationOp("$place", "$total", 2),
    },
  },
  ...(hackMode !== "tooManyDocs"
    ? [...filtersAggregation, ...paginationAggregation]
    : []),
];

export const paginate = page => [
  { $skip: ((Number(page) || 1) - 1) * PAGE_SIZE },
  { $limit: PAGE_SIZE },
];

export const multiSortAndPaginate = ({ sort, order, page }) => [
  ...(!sort?.length
    ? []
    : [{ $sort: multisortObj(sort?.split(","), order?.split(",")) }]),
  ...paginate(page),
];

// 🤌🤌🤌
export const textSearchMatch = (fields, filterString) => ({
  $or: fields.map(f => ({
    [f]: new RegExp(`.*${escapeRegExp(filterString)}.*`, "i"),
  })),
});

/** reimplements $getField aggregation operator that works in 7.0
 * (we need this because mongo doens't publish 7.x releases for docker/apt)
 */
export const getField = ({ input, field }) => ({
  $getField: {
    input: {
      $arrayElemAt: [
        {
          $filter: {
            input,
            cond: {
              $eq: ["$$this.k", field],
            },
          },
        },
        0,
      ],
    },
    field: "v",
  },
});
