"use client";

import uniqBy from "lodash.uniqby";
import Link from "next/link";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { Suspense, useMemo } from "react";

import { mapDivisionsFlat } from "@shared/constants/divisions";

import { useApi } from "@/hooks/useApi";
import useSearchParamState from "@/hooks/useSearchParamState";

const renderMatchLevel = (match: { level?: number }) => {
  const level = match.level;
  if (!level) {
    return null;
  }
  const romanNumerals: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV" };
  return romanNumerals[level] || level;
};

interface MatchData {
  uuid: string;
  name: string;
  level?: number;
  date?: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

const MajorsPageContent = () => {
  const { json: searchResults, loading } = useApi<MatchData[]>(
    `/upload/matchBumpMatches`,
  );

  const tableData = useMemo(
    () =>
      uniqBy(searchResults || [], c => c.uuid).map(c => ({
        ...c,
        date: c.date || new Date(c.created || c.updated || "").toDateString(),
        sort: new Date(c.date || c.updated || c.created || "").getTime() || 0,
      })),
    [searchResults],
  );

  const [matchLevels, setMatchLevels] = useSearchParamState("lvl", "2.3.4");
  const items = [
    { label: "IV", value: 4 },
    { label: "III", value: 3 },
    { label: "II", value: 2 },
    { label: "I", value: 1 },
  ].reverse();

  const filteredTableData = useMemo(
    () =>
      tableData.filter(c =>
        matchLevels
          .split(".")
          .map(Number)
          .includes(c.level || 0),
      ),
    [matchLevels, tableData],
  );

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-3">
        <div className="card flex justify-content-center">
          <SelectButton
            className="compact text-xs"
            value={matchLevels
              .split(".")
              .map(Number)
              .filter(c => [1, 2, 3, 4].includes(c))}
            onChange={e => setMatchLevels((e.value || []).join("."))}
            optionLabel="label"
            options={items}
            multiple
          />
        </div>
        <div className="flex flex-column" style={{ width: "min(64rem, 100vw)" }}>
          {!tableData.length ? (
            loading ? (
              <div className="w-full flex justify-content-center">
                <ProgressSpinner />
              </div>
            ) : (
              <div className="text-center mt-2 text-color-secondary">Nothing Found</div>
            )
          ) : (
            <DataTable
              className="text-sm md:text-base"
              stripedRows
              value={filteredTableData}
              size="small"
              totalRecords={tableData.length}
              sortField="sort"
              sortOrder={-1}
            >
              <Column
                field="level"
                header={() => (
                  <>
                    <div className="hidden md:inline-block">Level</div>
                    <div className="md:hidden">Lvl</div>
                  </>
                )}
                align="center"
                style={{ width: "4em", verticalAlign: "baseline" }}
                body={renderMatchLevel}
              />
              <Column
                field="name"
                style={{ minWidth: "calc(min(42em, 68vw))", verticalAlign: "baseline" }}
                header="Match"
                body={match => (
                  <a
                    href={`https://practiscore.com/results/new/${match.uuid}`}
                    target="_blank"
                    style={{
                      color: "unset",
                      textUnderlineOffset: "0.2em",
                      textDecorationColor: "rgba(255,255,255,0.5)",
                    }}
                    rel="noreferrer"
                  >
                    {match.name}
                  </a>
                )}
              />
              <Column
                field="divisions"
                header="Divisions"
                align="center"
                style={{ maxWidth: "calc(min(24em, 20vw))", verticalAlign: "baseline" }}
                body={match => {
                  const divisions = mapDivisionsFlat((div: string) =>
                    match[div] ? div : "",
                  ).filter(Boolean);

                  return (
                    <div className="flex flex-wrap justify-content-center gap-1">
                      {divisions.map((division: string) => (
                        <Link
                          className="weight-normal"
                          key={division}
                          href={`/upload/${match.uuid}/${division}`}
                        >
                          {division}
                        </Link>
                      ))}
                    </div>
                  );
                }}
              />
              <Column
                field="date"
                header="Date"
                style={{ minWidth: "7em", verticalAlign: "baseline" }}
              />
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
};

const MajorsPage = () => (
  <Suspense
    fallback={
      <div className="p-4 text-center">
        <ProgressSpinner />
      </div>
    }
  >
    <MajorsPageContent />
  </Suspense>
);

export default MajorsPage;
