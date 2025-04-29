import uniqBy from "lodash.uniqby";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { ProgressSpinner } from "primereact/progressspinner";
import { Link } from "react-router-dom";

import { mapDivisionsFlat } from "../../../../shared/constants/divisions";
import useApiQuery from "../../query/useApiQuery";

const MatchBumpMatches = () => {
  const { json: searchResults, loading } = useApiQuery(`/upload/matchBumpMatches`);

  const tableData = uniqBy(searchResults, c => c.uuid).map(c => ({
    ...c,
    date: c.date || new Date(c.created || c.updated).toDateString(),
    sort: new Date(c.date || c.updated || c.created).getTime() || 0,
  }));

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        <div className="flex flex-column" style={{ width: "min(64rem, 90vw)" }}>
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
              stripedRows
              value={tableData}
              size="small"
              totalRecords={tableData.length}
              sortField="sort"
              sortOrder={-1}
            >
              <Column
                field="date"
                header="Date"
                style={{ minWidth: "8em", verticalAlign: "baseline" }}
              />
              <Column
                field="name"
                style={{ minWidth: "24em", verticalAlign: "baseline" }}
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
                field="matchScoresCo"
                header="Scores"
                align="center"
                style={{ verticalAlign: "baseline" }}
                body={match => (
                  <Link to={`/upload/${match.uuid}`}>
                    <i className="pi pi-external-link" />
                  </Link>
                )}
              />
              <Column
                field="divisions"
                header="Divisions"
                align="center"
                style={{ verticalAlign: "baseline" }}
                body={match =>
                  mapDivisionsFlat(div => (match[div] ? div : ""))
                    .filter(Boolean)
                    .join(", ")
                }
              />
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchBumpMatches;
