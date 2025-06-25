import cx from "classnames";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { useEffect, useState } from "react";

import { deprecatedUSPSAClassifiers } from "../../../../../api/src/dataUtil/classifiersData";
import {
  classifierCodeSort,
  dateSort,
  numSort,
  stringSort,
} from "../../../../../shared/utils/sort";
import ClassifierCell from "../../../components/ClassifierCell";
import { letterRatingForPercent, renderPercent } from "../../../components/Table";
import useTableSort from "../../../components/Table/useTableSort";
import { useApi } from "../../../utils/client";

const terrenceHHFs = {
  "03-03": 7.737387682336051,
  "03-05": 9.127328556057847,
  "03-07": 5.895675003097409,
  "03-08": 9.441188592807563,
  "03-09": 10.175645375018576,
  "03-18": 7.085471045303263,
  "06-03": 13.750081900967633,
  "06-04": 12.739296786529358,
  "06-05": 12.452320917435916,
  "06-10": 7.157990521028712,
  "08-02": 7.3035087408710675,
  "08-03": 9.689311186035136,
  "09-10": 12.750627181101425,
  "13-02": 10.224277448686237,
  "13-04": 13.018052952040602,
  "13-05": 10.657281396868513,
  "13-06": 9.168842417675645,
  "18-03": 8.254878678829968,
  "18-05": 9.551509978680873,
  "18-07": 8.87780131469004,
  "18-08": 5.894640653108801,
  "18-09": 10.10064335893033,
  "19-01": 9.797805579762219,
  "19-02": 9.194399586548691,
  "19-04": 10.667339093307058,
  "20-01": 8.251584873617846,
  "20-02": 11.730650968421472,
  "20-03": 10.042110556977905,
  "21-01": 16.763898272869337,
  "22-01": 9.986230653557044,
  "22-02": 7.952777575449467,
  "22-04": 10.637785401631835,
  "22-06": 12.334631235560211,
  "22-07": 9.492792731437447,
  "23-01": 9.933527689593841,
  "23-02": 10.601615970084257,
  "24-01": 10.561469952602302,
  "24-02": 9.208373214014298,
  "24-04": 9.102663644523464,
  "24-06": 10.371388152676857,
  "24-08": 13.780745950559382,
  "24-09": 10.3865286590716,
  "99-08": 9.418750055096854,
  "99-10": 9.432315892602155,
  "99-11": 11.48998230140733,
  "99-12": 9.54215535939288,
  "99-13": 9.133142260402332,
  "99-19": 6.093110891849627,
  "99-28": 9.791682922699303,
  "99-42": 9.482514672384209,
  "99-46": 9.163099488850904,
  "99-53": 6.747960459217257,
  "99-57": 5.86204677106482,
  "99-62": 10.332721686314459,
};

//isSCSA ? 2 : 4
//isSCSA ? 's' : 0
const numFieldsDiff =
  (b, a, precision = 4, suffix = "") =>
  c => {
    const { [a]: ca, [b]: cb } = c;
    if (!ca || !cb) {
      return "—";
    }
    const sign = ca > cb ? "" : "+";
    const diff = cb - ca;
    const diffPercent = 100 * (cb / ca - 1);

    const hfDifference = `${sign} ${diff.toFixed(precision)}${suffix}`;
    const percentDifference = `${sign} ${diffPercent.toFixed(2)}`;

    return (
      <div>
        <div>{hfDifference}</div>
        <div style={{ fontSize: "0.8em" }}>({percentDifference}%)</div>
      </div>
    );
  };

export const doubleFieldDiff =
  (b, a, precision = 4, suffix = "", boldFn = () => false) =>
  c => {
    const { [a]: ca, [b]: cb } = c;
    if (!ca || !cb) {
      return "—";
    }
    const sign = ca > cb ? "" : "+";
    const diff = cb - ca;
    const diffPercent = 100 * (cb / ca - 1);

    const hfDifference = `${sign} ${diff.toFixed(precision)}${suffix}`;
    const percentDifference = `${sign} ${diffPercent.toFixed(2)}`;

    const boldStyle = boldFn(c)
      ? { fontWeight: "bold", WebkitTextStroke: "crimson", WebkitTextStrokeWidth: 0.5 }
      : {};

    return (
      <div className="flex flex-column" style={boldStyle}>
        {/*<div className="text-lg">{c[a].toFixed(precision)}</div>*/}
        <div className="text-sm">
          <div>{hfDifference}</div>
          <div>({percentDifference}%)</div>
        </div>
      </div>
    );
  };

const ClassifiersTable = ({ division, onClassifierSelection }) => {
  const isSCSA = division.startsWith("scsa");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resetSort, ...sortProps } = useTableSort({
    initial: { field: "code", order: 1 },
  });
  const [filter, setFilter] = useState("");
  const [nerdMode, setNerdMode] = useState(false);
  const [schizoMode, setSchizoMode] = useState(false);
  const [prod1015Mode, setProd1015Mode] = useState(false);
  const [locoMode, setLOCOMode] = useState(false);
  const sortState = sortProps;

  useEffect(() => {
    setProd1015Mode(false);
    setLOCOMode(false);
    setSchizoMode(false);
  }, [division]);

  const { json: dataRaw, loading } = useApi(`/classifiers/${division ?? ""}`);
  const data = (dataRaw ?? [])
    .map(d => ({
      ...d,
      updated: new Date(d.updated).toLocaleDateString("en-us", { timeZone: "UTC" }),
      recHHFChange: d.hhf - d.recHHF,
      recHHFChangePercent: 100 * (d.hhf / d.recHHF - 1),
      oldHHFChange: d.oldHHF - d.recHHF,
      oldHHFChangePercent: 100 * (d.oldHHF / d.recHHF - 1),
      terrenceHHF: terrenceHHFs[d.code],
      terrenceHHFSchizoDiff: d.schizoHHF - terrenceHHFs[d.code],
      terrenceHHFSchizoDiffPercent: 100 * (d.schizoHHF / terrenceHHFs[d.code] - 1),
    }))
    .sort((a, b) => {
      switch (sortState.sortField) {
        case "code":
          return classifierCodeSort(a, b, sortState.sortField, sortState.sortOrder);

        case "updated":
          return dateSort(a, b, sortState.sortField, sortState.sortOrder);

        default:
          if (typeof a[sortState.sortField] === "string") {
            return stringSort(a, b, sortState.sortField, sortState.sortOrder);
          }
          return numSort(a, b, sortState.sortField, sortState.sortOrder);
      }
    })
    .filter(cur => {
      if (!filter) {
        return true;
      }

      return `${cur.code}###${cur.name}`.toLowerCase().includes(filter.toLowerCase());
    });

  return (
    <DataTable
      size="small"
      className={cx("text-xs md:text-base", { "mt-4": isSCSA })}
      style={{ width: "fit-content", margin: "auto" }}
      loading={loading}
      showGridlines
      rowClassName={rowData =>
        cx({ "opacity-30": deprecatedUSPSAClassifiers.includes(rowData.code) })
      }
      selectionMode="single"
      selection={null}
      onSelectionChange={({ value }) => onClassifierSelection(value.code)}
      stripedRows
      header={
        !isSCSA && (
          <div className="flex align-items-end">
            <div className="flex flex-column gap-1">
              <div>{data.length} classifiers</div>
              <div className="text-xs flex gap-2 align-items-center">
                Nerd Mode
                <Checkbox onChange={e => setNerdMode(e.checked)} checked={nerdMode} />
                {division === "prod" && (
                  <>
                    <div className="ml-8" />
                    Prod 10 vs 15
                    <Checkbox
                      onChange={e => setProd1015Mode(e.checked)}
                      checked={prod1015Mode}
                    />
                  </>
                )}
                {division === "lo" && (
                  <>
                    <div className="ml-8" />
                    LO vs CO
                    <Checkbox onChange={e => setLOCOMode(e.checked)} checked={locoMode} />
                  </>
                )}
                {division === "l10" && (
                  <>
                    <div className="ml-8" />
                    Schizo Mode
                    <Checkbox
                      onChange={e => setSchizoMode(e.checked)}
                      checked={schizoMode}
                    />
                  </>
                )}
              </div>
            </div>
            <div className="md:flex-grow-1" />
            <span className="w-12 md:w-16rem p-input-icon-left">
              <i className="pi pi-search" />
              <InputText
                className="w-12"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search"
              />
            </span>
          </div>
        )
      }
      lazy
      value={data ?? []}
      removableSort
      {...sortProps}
    >
      <Column
        style={{ width: "5.5em" }}
        field="code"
        header="Classifier"
        sortable
        body={c => <ClassifierCell info={c} showScoring />}
      />
      <Column
        hidden={isSCSA || schizoMode}
        field="ccQuality"
        header="Quality"
        headerTooltip="New Quality for Classifier Committee, using correlations and SMSE"
        sortable
        style={{ width: "9em", minWidth: "9em", maxWidth: "9em" }}
        body={(c, { field }) => (
          <div className="flex gap-2 text-sm">
            <div className="flex flex-column">
              <div style={{ fontSize: "1.5em", textAlign: "center" }}>
                {letterRatingForPercent(c[field])}
              </div>
              <div>{renderPercent(c, { field })}</div>
            </div>
            <div
              style={{ fontSize: "0.65em" }}
              className="flex flex-column justify-content-between"
            >
              <div>G {c.inverse95RecPercentPercentile}%</div>
              <div>M {c.inverse85RecPercentPercentile}%</div>
              <div>A {c.inverse75RecPercentPercentile}%</div>
            </div>
          </div>
        )}
      />
      <Column
        hidden={isSCSA || schizoMode}
        field="allDivQuality"
        header="OA Qual."
        headerTooltip="New All Division Quality for Classifier Committee, using correlations and SMSE"
        sortable
        style={{ maxWidth: "7em" }}
        body={(c, { field }) => (
          <div className="flex gap-2 justify-content-center text-xs">
            <div className="flex flex-column">
              <div style={{ fontSize: "1.5em", textAlign: "center" }}>
                {letterRatingForPercent(c[field])}
              </div>
              <div>{renderPercent(c, { field })}</div>
            </div>
          </div>
        )}
      />
      <Column
        field="runs"
        header="Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod10Runs"
        header="Prod.10 Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod15Runs"
        header="Prod.15 Scores"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        hidden={!nerdMode}
        field="eloRuns"
        header="ELO Scores"
        headerTooltip="Scores by shooters that have ELO rating"
        sortable
        style={{ width: "100px" }}
        bodyStyle={{ textAlign: "center" }}
      />
      <Column
        field="recHHF"
        header={isSCSA ? "Rec. Peak Time" : "Rec. HHF"}
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (isSCSA ? `${c.recHHF.toFixed(2)}s` : c.recHHF.toFixed(4))}
      />
      <Column
        hidden={!schizoMode}
        field="opnHHF"
        header="Open HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.opnHHF.toFixed(4)}
      />
      <Column
        hidden={!schizoMode}
        field="coHHF"
        header="CO HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.coHHF.toFixed(4)}
      />
      <Column
        hidden={!schizoMode}
        field="ltdHHF"
        header="LTD HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.ltdHHF.toFixed(4)}
      />
      <Column
        hidden={!schizoMode}
        field="prod10HHF"
        header="P10 HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod10HHF ? c.prod10HHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!schizoMode}
        field="schizoHHF"
        header="Schizo HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (
          <span
            className={
              c.schizoHHF > c.prod10HHF &&
              c.schizoHHF >= c.ltdHHF &&
              c.schizoHHF <= c.opnHHF
                ? "text-green-400"
                : "text-yellow-400"
            }
          >
            {c.schizoHHF ? c.schizoHHF.toFixed(4) : "—"}
          </span>
        )}
      />
      <Column
        hidden={!schizoMode}
        field="terrenceHHF"
        header="Terrence HHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (
          <span
            className={
              terrenceHHFs[c.code] > c.prod10HHF &&
              terrenceHHFs[c.code] >= c.ltdHHF &&
              terrenceHHFs[c.code] <= c.opnHHF
                ? "text-green-400"
                : "text-yellow-400"
            }
          >
            {terrenceHHFs[c.code].toFixed(4)}
          </span>
        )}
      />
      <Column
        hidden={!schizoMode}
        field="terrenceHHFSchizoDiffPercent"
        header="Schizo Diff"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={numFieldsDiff("schizoHHF", "terrenceHHF", 4, " HF")}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod10HHF"
        header="Prod10 RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod10HHF ? c.prod10HHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!prod1015Mode}
        field="prod15HHF"
        header="Prod15 RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.prod15HHF ? c.prod15HHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!locoMode}
        field="loHHF"
        header="LO RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.loHHF ? c.loHHF.toFixed(4) : "—")}
      />
      <Column
        hidden={!locoMode}
        field="coHHF"
        header="CO RHHF"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => (c.coHHF ? c.coHHF.toFixed(4) : "—")}
      />
      <Column
        hidden={division === "l10"}
        field="curHHF"
        header={isSCSA ? "HQ Peak Time" : "HQ HHF"}
        sortable
        style={{ width: "100px" }}
        align="right"
        body={c => {
          if (c.curHHF <= 0) {
            return (
              <span
                style={{ display: "inline-block", width: "100%", textAlign: "center" }}
              >
                —
              </span>
            );
          }

          return c.curHHF.toFixed(4);
        }}
      />
      <Column
        hidden={!nerdMode}
        field="recHHFChangePercent" /** field is Percent for sorting, still shows like PeakTime/HHF */
        header="Rec. minus HQ"
        sortable
        body={numFieldsDiff("recHHF", "curHHF", isSCSA ? 2 : 4, isSCSA ? "s" : " HF")}
      />
      <Column
        hidden={division === "l10"}
        field="oldHHF"
        header="Old HHF"
        headerTooltip="HQ HHF before March 2025 Update"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={c => c.oldHHF.toFixed(4)}
      />
      <Column
        hidden
        field="oldHHFChangePercent" /** field is Percent for sorting, still shows like PeakTime/HHF */
        header="Rec. minus Old HQ"
        sortable
        body={numFieldsDiff("recHHF", "oldHHF", isSCSA ? 2 : 4, isSCSA ? "s" : " HF")}
      />
      <Column
        hidden={!nerdMode}
        field="meanSquaredError"
        header="MSE"
        headerTooltip="Mean Squared Error against Fitted Weibull"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field].toFixed(4)}
      />
      <Column
        hidden={!nerdMode}
        field="superMeanSquaredError"
        header="SMSE"
        headerTooltip="Mean Squared Error against k=3.6 Weibull"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field].toFixed(4)}
      />
      <Column
        hidden={!nerdMode}
        field="eloCorrelation"
        header="rELO"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
      <Column
        hidden={!nerdMode}
        field="classificationCorrelation"
        header="rClass"
        headerTooltip="Classification Percentage Correlation"
        sortable
        style={{ width: "100px", textAlign: "right" }}
        body={(c, { field }) => c[field]?.toFixed(4) || "?"}
      />
    </DataTable>
  );
};

export default ClassifiersTable;
