import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import ClassifierCell from "@web/components/ClassifierCell";
import ShooterCell from "@web/components/ShooterCell";
import {
  clubMatchColumn,
  headerTooltipOptions,
  renderHFOrNA,
  renderPercent,
} from "@web/components/Table";
import useApiQuery from "@web/query/useApiQuery";

import ReportDialog, {
  MarkAsBadButton,
  ReportButton,
} from "../../components/ReportDialog";
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const ReportsPage = () => {
  const reportDialogRef = useRef(null);
  const navigate = useNavigate();
  const onShooterSelection = (memberNumber, division) =>
    window.open(`/shooters/${division}/${memberNumber}`, "_blank");
  const onClassifierSelection = (classifier, division) =>
    window.open(`/classifiers/${division}/${classifier}`, "_blank");

  const { json, loading, refetch } = useApiQuery("/report");

  return (
    <div className="p-0 md:px-4">
      <div className="flex flex-column flex align-items-center mt-2">
        <div className="flex flex-column" style={{ width: "min(90rem, 90vw)" }}>
          <DataTable loading={loading} value={json}>
            <Column
              field="sd"
              header="Date"
              sortable
              body={c => new Date(c.sd).toLocaleDateString()}
              style={{ width: "6rem" }}
            />
            <Column field="comment" header="Comment" style={{ width: "10rem" }} />
            <Column
              sortable
              field="memberNumber"
              header="Shooter"
              body={run => (
                <ShooterCell
                  sport="USPSA"
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
                  showScoring
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
              body={(c, { field }) => renderHFOrNA(c, { field })}
            />
            <Column
              body={renderPercent}
              field="recPercent"
              header="Rec. %"
              sortable
              headerTooltip="Recommended classifier percentage for this score."
              headerTooltipOptions={headerTooltipOptions}
            />
            <Column {...clubMatchColumn} />
            <Column
              field="url"
              header="URL"
              align="center"
              body={c => (
                <Link to={c.url} target="_blank">
                  <i className="pi pi-external-link" />
                </Link>
              )}
            />
            <Column field="type" header="Type" sortable />
            <Column field="reason" header="Rsn" />
            <Column
              body={c => (
                <div className="flex">
                  <MarkAsBadButton
                    onClick={async () => {
                      await reportDialogRef.current.markAsBad({ ...c, reportId: c._id });
                      await delay(300);
                      refetch();
                    }}
                  />
                  <Button
                    text
                    onClick={async () => {
                      await reportDialogRef.current.ignore(c._id);
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
