"use client";

import uniqBy from "lodash.uniqby";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import {
  Suspense,
  forwardRef,
  use,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useDebounce } from "use-debounce";

import DivisionNavigation from "@/components/DivisionNavigation";
import { useApi } from "@/hooks/useApi";
import useSearchParamState from "@/hooks/useSearchParamState";

const DateText = ({
  dateString,
  className,
}: {
  dateString: string;
  className?: string;
}) => {
  const date = new Date(dateString);
  const isValid = !Number.isNaN(date.getTime());

  if (!isValid) {
    return <div className="text-right text-color-secondary">N/A</div>;
  }

  return (
    <div className={`text-right ${className || ""}`}>
      <div>{date.toLocaleDateString()}</div>
      <div>
        {date.toLocaleTimeString([], {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
};

interface MatchSearchInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

interface MatchSearchInputHandle {
  setValue: (value: string) => void;
}

const MatchSearchInput = forwardRef<MatchSearchInputHandle, MatchSearchInputProps>(
  ({ placeholder, value: valueProp, onChange }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(valueProp);
    const [debouncedValue] = useDebounce(value, 350);

    useEffect(() => {
      onChange?.(debouncedValue);
    }, [debouncedValue, onChange]);

    useEffect(() => {
      setValue(valueProp);
    }, [valueProp]);

    useImperativeHandle(
      ref,
      () => ({
        setValue,
      }),
      [setValue],
    );

    return (
      <span className="flex relative p-input-icon-left w-12">
        <i className="pi pi-search" />
        <InputText
          className="flex-grow-1"
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
        />
        <span
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-50"
          style={{
            top: "50%",
            marginTop: "-0.5rem",
            width: "1rem",
            height: "1rem",
            textAlign: "center",
            lineHeight: "1rem",
            cursor: "pointer",
            fontSize: "1.25rem",
            marginRight: "14px",
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          &#10005;
        </span>
      </span>
    );
  },
);

MatchSearchInput.displayName = "MatchSearchInput";

interface MatchSearchResult {
  uuid: string;
  name: string;
  state?: string;
  scoresCount?: number;
  matchDate?: string;
  created?: string;
  updated?: string;
  uploaded?: string;
  templateName?: string;
  type?: string;
  subType?: string;
}

const SearchUploadsContent = () => {
  const [searchQuery, setSearchQuery] = useSearchParamState("q", "");
  const { json: searchResults, loading } = useApi<MatchSearchResult[]>(
    searchQuery ? `/upload/searchMatches?q=${encodeURIComponent(searchQuery)}` : null,
  );

  const tableData = uniqBy(searchResults || [], c => c.uuid).map(c => ({
    ...c,
    date: c.matchDate || c.created || c.updated,
    sort:
      new Date(c.uploaded || c.updated || c.matchDate || c.created || "").getTime() || 0,
    uploadedAfterUpdated:
      new Date(c.uploaded || "").getTime() >=
      new Date(c.updated || c.created || c.matchDate || "").getTime(),
  }));

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        <div className="flex flex-column" style={{ width: "min(64rem, 90vw)" }}>
          <MatchSearchInput
            placeholder="Search Matches"
            value={searchQuery}
            onChange={setSearchQuery}
          />
          {!tableData.length ? (
            loading && !!searchQuery ? (
              <div className="w-full flex justify-content-center">
                <ProgressSpinner />
              </div>
            ) : (
              <div className="text-center mt-2 text-color-secondary">
                Search for a match name to check its upload status
              </div>
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
                field="state"
                header="State"
                style={{ verticalAlign: "baseline", width: "4em" }}
                bodyStyle={{ textAlign: "center" }}
              />
              <Column
                field="name"
                style={{ width: "24em", verticalAlign: "baseline" }}
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
                field="matchScores"
                header="Results"
                align="center"
                style={{ verticalAlign: "baseline" }}
                body={match => (
                  <Link href={`/upload/${match.uuid}?q=${searchQuery}`}>
                    <i className="pi pi-external-link" />
                  </Link>
                )}
              />
              <Column
                field="scoresCount"
                header="# of Scores"
                align="right"
                style={{ verticalAlign: "baseline" }}
              />
              <Column
                header="Created"
                body={match => <DateText dateString={match.created} />}
              />
              <Column
                header="Updated"
                body={match => <DateText dateString={match.updated} />}
              />
              <Column
                header="Uploaded"
                body={match => (
                  <DateText
                    dateString={match.uploaded}
                    className={match.uploadedAfterUpdated ? "text-green-400" : ""}
                  />
                )}
              />
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
};

const SearchUploads = () => (
  <Suspense
    fallback={
      <div className="p-4 text-center">
        <ProgressSpinner />
      </div>
    }
  >
    <SearchUploadsContent />
  </Suspense>
);

interface MatchData {
  name?: string;
  uuid?: string;
}

interface MatchPageProps {
  uuid: string;
  division?: string;
}

const MatchPage = ({ uuid, division }: MatchPageProps) => {
  const router = useRouter();
  const { json: match, loading } = useApi<MatchData>(`/upload/${uuid}`);
  const [searchQuery] = useSearchParamState("q", "");

  const onDivisionSelect = useCallback(
    (newDivision: string) => {
      router.push(`/upload/${uuid}/${newDivision || ""}?q=${searchQuery}`);
    },
    [router, uuid, searchQuery],
  );

  const [scoresMode, setScoresMode] = useState("Linear Regression");

  return (
    <div>
      <div className="p-0 md:px-4">
        <div className="flex flex-column flex align-items-center mt-2">
          <div className="flex flex-column" style={{ width: "min(90rem, 90vw)" }}>
            <div className="flex justify-content-between">
              <Button
                className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
                icon="pi pi-chevron-left"
                rounded
                text
                aria-label="Back"
                onClick={() => router.push(`/upload?q=${searchQuery}`)}
              >
                Uploads
              </Button>
              <h2 className="mx-auto md:text-xl lg:text-xxl w-max">{match?.name}</h2>
            </div>
            <DivisionNavigation division={division} onSelect={onDivisionSelect} />
            {division && (
              <>
                <div className="flex justify-content-between align-items-center my-3">
                  <div className="m-auto">
                    <SelectButton
                      className="compact text-xs"
                      allowEmpty={false}
                      options={[
                        { label: "Linear Regression", value: "Linear Regression" },
                        { label: "Weibull", value: "Weibull" },
                      ]}
                      optionLabel="label"
                      optionValue="value"
                      value={scoresMode}
                      onChange={e => setScoresMode(e.value as string)}
                    />
                  </div>
                </div>
                <div className="p-4 text-center surface-ground border-round">
                  <p className="text-600">
                    {loading
                      ? "Loading match data..."
                      : `Match charts and scores for ${division?.toUpperCase()} will be displayed here`}
                  </p>
                  <p className="text-sm text-500 mt-2">Mode: {scoresMode}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface UploadPageProps {
  params: Promise<{ params?: string[] }>;
}

const UploadPage = ({ params }: UploadPageProps) => {
  const resolvedParams = use(params);
  const [uuid, division] = resolvedParams?.params || [];

  if (!uuid) {
    return <SearchUploads />;
  }

  return <MatchPage uuid={uuid} division={division} />;
};

export default UploadPage;
