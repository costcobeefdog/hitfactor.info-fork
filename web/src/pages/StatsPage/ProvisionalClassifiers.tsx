import cx from "classnames";
import { ProgressBar } from "primereact/progressbar";
import { ProgressSpinner } from "primereact/progressspinner";
import { useState } from "react";

import { uspsaDivShortToShortDisplay } from "@shared/constants/divisions";
import ModeSwitch from "@web/components/ModeSwitch";
import { useApi } from "@web/utils/client";

const Progress = ({
  value,
  label,
  reverse,
}: {
  value: number;
  label: string;
  reverse?: boolean;
}) => (
  <div
    className={cx("flex align-items-center justify-content-between", {
      "flex-row-reverse": reverse,
    })}
    style={{ width: "calc(min(92vw, 32rem))" }}
  >
    <ProgressBar
      className="text-xs md:text-base"
      value={value}
      style={{ width: "calc(min(70vw, 26rem))" }}
      pt={
        value >= 6
          ? {}
          : {
              value: { style: { overflow: "visible" } },
              label: {
                className: "ml-2 md:ml-0",
                style: {
                  color: "white",
                  position: "relative",
                  left: "1.5em",
                },
              },
            }
      }
    />
    <div>{label}</div>
  </div>
);

interface ScoresStat {
  scores: number;
  classifier: string;
  division: string;
}

// l10 fully depends on other divisions for HHFs
const divisions = ["opn", "ltd", "prod", "rev", "ss", "co", "lo", "pcc"];
const classifiers = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => `25-0${c}`);

const ByClassifier = ({ data }: { data: ScoresStat[] | null }) => {
  if (!data) {
    return null;
  }

  const percentData = data.map(c => ({
    ...c,
    percent: (100 * Math.min(c.scores, 150)) / 150,
  }));
  const percentDataByClassifier = percentData.reduce(
    (acc, cur) => {
      acc.total ??= 0;
      acc[cur.classifier] ??= 0;
      acc[cur.classifier] += Math.round(cur.percent / divisions.length);
      acc.total += Math.round(cur.percent / (divisions.length * classifiers.length));
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <div className="mb-4 mt-2">
        <Progress label="Total" value={percentDataByClassifier.total} reverse />
      </div>
      {classifiers.map(c => (
        <Progress key={c} label={c} value={percentDataByClassifier[c] ?? 0} reverse />
      ))}
    </>
  );
};

const ByBoth = ({ data }: { data: ScoresStat[] | null }) => {
  if (!data) {
    return null;
  }

  const percentData = data.map(c => ({
    ...c,
    percent: (100 * Math.min(c.scores, 150)) / 150,
  }));
  const percentDataByClassifierDivision = percentData.reduce(
    (acc, cur) => {
      const key = `${cur.classifier}:${cur.division}`;
      acc.total ??= 0;
      acc[key] ??= 0;
      acc[key] += Math.round(cur.percent);
      acc.total += Math.round(cur.percent / (divisions.length * classifiers.length));
      return acc;
    },
    {} as Record<string, number>,
  );

  const pairs = Object.keys(percentDataByClassifierDivision)
    .sort(
      (a, b) => percentDataByClassifierDivision[b] - percentDataByClassifierDivision[a],
    )
    .filter(key => key !== "total" && !key.endsWith("l10"));

  return (
    <>
      <div className="mb-4 mt-2">
        <Progress label="Total" value={percentDataByClassifierDivision.total} reverse />
      </div>
      {pairs.map(cd => {
        const [classifier, division] = cd.split(":");
        const label = `${classifier} ${uspsaDivShortToShortDisplay[division] || ""}`;
        return (
          <Progress
            key={cd}
            label={label}
            value={percentDataByClassifierDivision[cd] ?? 0}
          />
        );
      })}
    </>
  );
};

const ByDivision = ({ data }: { data: ScoresStat[] | null }) => {
  if (!data) {
    return null;
  }

  const percentData = data.map(c => ({
    ...c,
    percent: (100 * Math.min(c.scores, 150)) / 150,
  }));
  const percentDataByDivision = percentData.reduce(
    (acc, cur) => {
      acc.total ??= 0;
      acc[cur.division] ??= 0;
      acc[cur.division] += Math.round(cur.percent / classifiers.length);
      acc.total += Math.round(cur.percent / (divisions.length * classifiers.length));
      return acc;
    },
    {} as Record<string, number>,
  );
  return (
    <>
      <div className="mb-4 mt-2">
        <Progress label="Total" value={percentDataByDivision.total} />
      </div>
      {divisions.map(div => (
        <Progress
          label={uspsaDivShortToShortDisplay[div]}
          value={percentDataByDivision[div] ?? 0}
          key={div}
        />
      ))}
    </>
  );
};

const ProvisionalClassifiers = () => {
  const [mode, setMode] = useState("By Division");
  const { json: data, loading } = useApi("/stats/25series");
  return (
    <div className="flex flex-column gap-2 flex-wrap align-items-center">
      {loading ? (
        <div className="flex flex-justify-around p-4">
          <ProgressSpinner />
        </div>
      ) : (
        <>
          <ModeSwitch
            {...{ mode, setMode, modes: ["By Classifier", "By Division", "By Both"] }}
          />
          {mode === "By Division" && <ByDivision data={data} />}
          {mode === "By Classifier" && <ByClassifier data={data} />}
          {mode === "By Both" && <ByBoth data={data} />}
        </>
      )}
    </div>
  );
};

export default ProvisionalClassifiers;
