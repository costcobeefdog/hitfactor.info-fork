/**
 * MongoDB aggregation utilities - ported from api/src/db/utils.ts
 */

import { PAGE_SIZE } from "./pagination";

/**
 * Escape special regex characters in a string.
 */
export const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Aggregation operator for calculating percentage.
 */
export const percentAggregationOp = (
  value: string,
  total: string,
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
 * Create a multi-sort object from arrays of fields and orders.
 */
export const multisortObj = (
  fields: string[] | undefined,
  orders: string[] | undefined,
): Record<string, 1 | -1> =>
  Object.fromEntries(
    (fields || []).map((f, i) => [f, Number(orders?.[i] || 0) > 0 ? 1 : -1]),
  );

/**
 * Pagination aggregation stages.
 */
export const paginate = (page: number | string) => [
  { $skip: ((Number(page) || 1) - 1) * PAGE_SIZE },
  { $limit: PAGE_SIZE },
];

/**
 * Multi-sort and pagination aggregation stages.
 */
export const multiSortAndPaginate = ({
  sort,
  order,
  page,
}: {
  sort?: string;
  order?: string;
  page?: number | string;
}) => [
  ...(!sort?.length
    ? []
    : [{ $sort: multisortObj(sort?.split(","), order?.split(",")) }]),
  ...paginate(page || 1),
];

/**
 * Text search match operator for filtering by text fields.
 */
export const textSearchMatch = (fields: string[], filterString: string) => ({
  $or: fields.map((f) => ({
    [f]: new RegExp(`.*${escapeRegExp(filterString)}.*`, "i"),
  })),
});

/**
 * Final step aggregation for classifier runs and shooters.
 * Sorts by placeByField and calculates extra fields for pagination.
 */
export const addPlaceAndPercentileAggregation = (
  placeByField: string,
  filtersAggregation: object[],
  paginationAggregation: object[],
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

/**
 * Helper to get a field from the first element of a lookup array.
 */
export const getFieldFromLookup = (lookupField: string, field: string) => ({
  $getField: {
    input: { $arrayElemAt: [`$${lookupField}`, 0] },
    field,
  },
});
