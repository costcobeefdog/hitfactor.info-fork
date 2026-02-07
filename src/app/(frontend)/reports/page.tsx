"use client";

import Link from "next/link";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useRef } from "react";

import ReportDialog, {
  MarkAsBadButton,
  ReportDialogHandle,
} from "@/components/ReportDialog";
import { useApi } from "@/hooks/useApi";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ShooterCellProps {
  data: { memberNumber?: string; name?: string };
  onClick?: () => void;
}

const ShooterCell = ({ data, onClick }: ShooterCellProps) => (
  <Button text size="small" onClick={onClick} className="p-0 text-left">
    <div className="flex flex-column">
      <span className="font-medium">{data.memberNumber}</span>
      {data.name && <span className="text-xs text-500">{data.name}</span>}
    </div>
  </Button>
);

interface ClassifierCellProps {
  info: { code?: string; name?: string };
  fallback?: string;
  onClick?: () => void;
}

const ClassifierCell = ({ info, fallback, onClick }: ClassifierCellProps) => (
  <Button text size="small" onClick={onClick} className="p-0 text-left">
    <span>{info?.code || fallback || "N/A"}</span>
  </Button>
);

interface ReportData {
  _id: string;
  sd?: string;
  comment?: string;
  memberNumber?: string;
  name?: string;
  division?: string;
  classifier?: string;
  matchName?: string;
  hf?: number;
  recPercent?: number;
  club_name?: string;
  url?: string;
  type?: string;
  reason?: string;
}

const renderHFOrNA = (c: ReportData) => {
  if (!c.hf || c.hf < 0) {
    return "N/A";
  }
  return c.hf.toFixed(4);
};

const renderPercent = (c: ReportData) => {
  if (!c.recPercent || c.recPercent < 0) {
    return "N/A";
  }
  return `${c.recPercent.toFixed(2)}%`;
};

const ReportsPage = () => {
  const reportDialogRef = useRef<ReportDialogHandle>(null);
  const onShooterSelection = (memberNumber: string, division: string) =>
    window.open(`/shooters/${division}/${memberNumber}`, "_blank");
  const onClassifierSelection = (classifier: string, division: string) =>
    window.open(`/classifiers/${division}/${classifier}`, "_blank");

  const { json, loading, refetch } = useApi<ReportData[]>("/report");

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        <div className="flex flex-column" style={{ width: "min(90rem, 90vw)" }}>
          <DataTable loading={loading} value={json || []}>
            <Column
              field="sd"
              header="Date"
              sortable
              body={c => (c.sd ? new Date(c.sd).toLocaleDateString() : "N/A")}
              style={{ width: "6rem" }}
            />
            <Column field="comment" header="Comment" style={{ width: "10rem" }} />
            <Column
              sortable
              field="memberNumber"
              header="Shooter"
              body={run => (
                <ShooterCell
                  data={run}
                  onClick={() => onShooterSelection?.(run.memberNumber, run.division)}
                />
              )}
            />
            <Column field="division" header="Div" />
            <Column
              field="classifier"
              header="Classifier"
              sortable
              body={c => (
                <ClassifierCell
                  info={{ code: c.classifier, name: "" }}
                  fallback={c.matchName}
                  onClick={() => onClassifierSelection?.(c.classifier, c.division)}
                />
              )}
            />
            <Column
              field="hf"
              header="HF"
              style={{ maxWidth: "9.3em" }}
              sortable
              body={renderHFOrNA}
            />
            <Column body={renderPercent} field="recPercent" header="Rec. %" sortable />
            <Column field="club_name" header="Club" style={{ maxWidth: "12em" }} />
            <Column
              field="url"
              header="URL"
              align="center"
              body={c =>
                c.url ? (
                  <Link href={c.url} target="_blank">
                    <i className="pi pi-external-link" />
                  </Link>
                ) : null
              }
            />
            <Column field="type" header="Type" sortable />
            <Column field="reason" header="Rsn" />
            <Column
              body={c => (
                <div className="flex">
                  <MarkAsBadButton
                    onClick={async () => {
                      await reportDialogRef.current?.markAsBad({ ...c, reportId: c._id });
                      await delay(300);
                      refetch();
                    }}
                  />
                  <Button
                    text
                    onClick={async () => {
                      await reportDialogRef.current?.ignore(c._id);
                      await delay(300);
                      refetch();
                    }}
                  >
                    Ignore
                  </Button>
                </div>
              )}
            />
          </DataTable>
          <ReportDialog ref={reportDialogRef} />
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
