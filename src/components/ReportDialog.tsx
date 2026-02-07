"use client";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { useCallback, useRef, useState, useImperativeHandle, forwardRef } from "react";

import { postApi } from "@/hooks/useApi";

interface ApiResponse {
  status: number;
  [key: string]: unknown;
}

const renderField = (value: unknown, fieldName: string): string | null => {
  if (!value) {
    return null;
  }

  switch (fieldName) {
    case "sd": {
      const date = new Date(value as string);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.toLocaleDateString("en-us", { timeZone: "UTC" });
    }

    case "hf":
      if ((value as number) < 0) {
        return "";
      }
      return `HF ${value}`;

    case "division":
      return (value as string).toUpperCase();

    case "percent":
    case "recPercent":
    case "curPercent":
      return `${Number(value).toFixed(2)}%`;

    default:
      return value as string;
  }
};

const reportDocRenderFields = [
  "sd",
  "memberNumber",
  "name",
  "division",
  "classifier",
  "matchName",
  "hf",
  "recPercent",
];

const reportDocSendFields = [
  ...reportDocRenderFields,
  "clubid",
  "club_name",
  "percent",
  "targetId",
  "_id",
  "reportId",
];

interface ReportReason {
  name: string;
  code: string;
}

export interface ReportDialogHandle {
  startReport: (doc: Record<string, unknown>) => void;
  ignore: (reportId: string) => Promise<void>;
  markAsBad: (doc: Record<string, unknown>) => Promise<void>;
}

interface ReportDialogProps {
  type?: "Score" | "Shooter";
}

export const ReportDialog = forwardRef<ReportDialogHandle, ReportDialogProps>(
  ({ type = "Score" }, ref) => {
    const toast = useRef<Toast>(null);
    const [visible, setVisible] = useState(false);
    const [sending, setSending] = useState(false);
    const [comment, setComment] = useState("");
    const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
    const [reason, setReason] = useState<ReportReason | null>(null);

    const reasons: ReportReason[] = [
      type === "Score" && { name: "Suspicious Score", code: "sus" },
      { name: `Duplicate ${type}`, code: "dupe" },
      type === "Shooter" && { name: "Known Cheater", code: "cheat" },
      { name: "Bad Data", code: "bad" },
    ].filter(Boolean) as ReportReason[];

    useImperativeHandle(
      ref,
      () => ({
        startReport: (newDoc: Record<string, unknown>) => {
          setComment("");
          setReason(null);
          setDoc(newDoc);
          setSending(false);
          setVisible(true);
        },
        ignore: async (reportId: string) => {
          try {
            const response = await postApi<ApiResponse>("/report/ignore", { reportId });
            if (response.status !== 200) {
              throw new Error(JSON.stringify(response));
            }
            setVisible(false);
            setSending(false);
            toast.current?.show({
              severity: "success",
              summary: "Report Ignored",
              detail: <div>{JSON.stringify(response)}</div>,
              life: 3000,
            });
          } catch (e) {
            toast.current?.show({
              severity: "error",
              summary: "Error Ignoring Report",
              detail: (e as Error).toString(),
              life: 5000,
            });
          }
        },
        markAsBad: async (newDoc: Record<string, unknown>) => {
          try {
            const reportDoc = Object.fromEntries(
              Object.entries(newDoc || {}).filter(([key]) =>
                reportDocSendFields.includes(key),
              ),
            );
            reportDoc.url =
              typeof window !== "undefined" ? window.location.toString() : "";
            reportDoc.reason = "bad";
            reportDoc.comment = "";
            reportDoc.type = type || newDoc.type;
            const response = await postApi<ApiResponse>("/report/bad", reportDoc);
            if (response.status !== 200) {
              throw new Error(JSON.stringify(response));
            }
            setVisible(false);
            setSending(false);
            toast.current?.show({
              severity: "success",
              summary: "Marked Bad",
              detail: (
                <div>
                  {reportDocRenderFields
                    .map(key => renderField(newDoc?.[key], key))
                    .filter(Boolean)
                    .join(" - ")}
                </div>
              ),
              life: 3000,
            });
          } catch (e) {
            toast.current?.show({
              severity: "error",
              summary: "Error Marking as Bad",
              detail: (e as Error).toString(),
              life: 5000,
            });
          }
        },
      }),
      [type],
    );

    const reportDocRender = reportDocRenderFields
      .map(key => renderField(doc?.[key], key))
      .filter(Boolean)
      .join(" - ");

    const handleSendReport = useCallback(async () => {
      setSending(true);

      const reportDoc = Object.fromEntries(
        Object.entries(doc || {}).filter(([key]) => reportDocSendFields.includes(key)),
      );
      reportDoc.url = typeof window !== "undefined" ? window.location.toString() : "";
      reportDoc.reason = reason?.code;
      reportDoc.comment = comment;
      reportDoc.type = type;

      try {
        await postApi("/report", reportDoc);
        setVisible(false);
        setSending(false);
        toast.current?.show({
          severity: "success",
          summary: "Report Sent",
          detail: (
            <>
              <div>{reason?.name}:</div>
              <div>{reportDocRender}</div>
              <br />
              <div>Comments:</div>
              <div>{comment}</div>
            </>
          ),
          life: 3000,
        });
      } catch (e) {
        setSending(false);
        toast.current?.show({
          severity: "error",
          summary: "Error Sending Report",
          detail: (e as Error).toString(),
          life: 5000,
        });
      }
    }, [reason, comment, doc, type, reportDocRender]);

    return (
      <>
        <Toast ref={toast} />
        <Dialog
          visible={visible}
          onHide={() => setVisible(false)}
          header={`Report ${type}`}
          contentClassName="px-0 md:px-4 pb-4"
          headerClassName="pb-0"
        >
          <div
            className="flex flex-column align-items-center pt-4 mx-1 gap-4"
            style={{ marginLeft: "-1rem", width: "calc(min(30em, 80vw))" }}
          >
            <div className="w-full max-w-full text-xs md:text-sm text-500 text-center">
              {reportDocRender}
            </div>
            <div className="w-full max-w-full">
              <Dropdown
                placeholder="Reason"
                value={reason}
                onChange={e => setReason(e.value)}
                options={reasons}
                optionLabel="name"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <InputTextarea
                className="w-full"
                placeholder="Comments / Explanation"
                style={{
                  minHeight: "10em",
                }}
                id="reportComment"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>
            <div className="flex gap-4 w-12">
              <div className="flex-grow-1" />
              <Button
                label="Cancel"
                text
                className="ml-auto"
                onClick={() => setVisible(false)}
              />
              <Button
                loading={sending}
                label="Send Report"
                disabled={!reason || !comment}
                onClick={handleSendReport}
              />
            </div>
          </div>
        </Dialog>
      </>
    );
  },
);

ReportDialog.displayName = "ReportDialog";

export const ReportButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    icon="pi pi-flag text-xs md:text-base"
    size="small"
    style={{ width: "1em" }}
    onClick={onClick}
    text
  />
);

export const MarkAsBadButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    icon="pi pi-trash text-xs md:text-base"
    size="small"
    style={{ width: "1em" }}
    onClick={onClick}
    text
  />
);

export default ReportDialog;
