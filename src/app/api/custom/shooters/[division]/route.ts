/**
 * GET /api/custom/shooters/[division]
 * Returns paginated list of shooters for a division.
 */

import { NextRequest, NextResponse } from "next/server";

import { aggregate } from "@/lib/mongodb";
import {
  addPlaceAndPercentileAggregation,
  multiSortAndPaginate,
  textSearchMatch,
} from "@/lib/utils/aggregation";

interface Props {
  params: Promise<{ division: string }>;
}

const DEFAULT_PLACE_BY = "reclassificationsRecPercentUncappedCurrent";

const placeByFieldForSort = (sort?: string) => {
  if (
    sort &&
    [
      "current",
      "reclassificationsRecPercentUncappedCurrent",
      "reclassificationsRecPercentUncappedHigh",
      "reclassificationsMajorsCurrent",
      "elo",
    ].includes(sort)
  ) {
    return sort;
  }
  return DEFAULT_PLACE_BY;
};

const inconsistencyFilter = (inconString?: string) => {
  if (!inconString) {
    return [];
  }

  const [inconsistencies, inconsistenciesMode] = inconString.split("-");
  const field = `$${inconsistencies}Rank`;
  const operator = inconsistenciesMode === "paper" ? "$lt" : "$gt";
  return [{ $match: { $expr: { [operator]: [field, "$hqClassRank"] } } }];
};

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { division } = await params;
    const { searchParams } = new URL(request.url);

    const filterString = searchParams.get("filter") || undefined;
    const inconString = searchParams.get("inconsistencies") || undefined;
    const classFilter = searchParams.get("classFilter") || undefined;
    const sort = searchParams.get("sort") || undefined;
    const order = searchParams.get("order") || undefined;
    const page = searchParams.get("page") || "1";

    const placeByField = placeByFieldForSort(sort);

    const pipeline = [
      {
        $project: {
          __v: false,
        },
      },
      {
        $match: {
          division,
          memberNumber: { $not: /^X+$/i },
          [placeByField]: { $gt: 0 },
        },
      },
      ...addPlaceAndPercentileAggregation(
        placeByField,
        [
          ...(!classFilter ? [] : [{ $match: { class: classFilter } }]),
          ...(!filterString
            ? []
            : [
                {
                  $match: textSearchMatch(["memberNumber", "name"], filterString),
                },
              ]),
          ...inconsistencyFilter(inconString),
        ],
        multiSortAndPaginate({ sort, order, page }),
      ),
    ];

    const shooters = await aggregate<Record<string, unknown>>(
      "shooters",
      pipeline,
    );

    return NextResponse.json({
      shooters,
      shootersTotal: (shooters[0]?.total as number) || 0,
      shootersTotalWithoutFilters:
        (shooters[0]?.totalWithoutFilters as number) || 0,
      shootersPage: Number(page) || 1,
    });
  } catch (error) {
    console.error("Error fetching shooters:", error);
    return NextResponse.json(
      { error: "Failed to fetch shooters" },
      { status: 500 },
    );
  }
}
