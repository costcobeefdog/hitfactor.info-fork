import { ProgressSpinner } from "primereact/progressspinner";
import { useState } from "react";

import { uspsaDivShortNames } from "@shared/constants/divisions";
import {
  ScoresModeSelectButton,
  defaultScoresMode,
} from "@web/components/ScoresModeSelectButton";

import { Line, r1annotationColor } from "./common";

import { keepPreviousData, useApi } from "../../utils/client";

const paletteA = {
  opn: "#a855f7",
  pcc: "#fb7185",
  lo: "#6366f1",
  co: "#38bdf8",
  prod: "#a3e635",
  ltd: "#ae9ef1",
  l10: "#f97316",
  ss: "#2dd4bf",
  rev: "#fbbf24",
};

const paletteB = {
  opn: "#ca258a",
  pcc: "#be123c",
  lo: "#312e81",
  co: "#0284c7",
  prod: "#65a30d",
  ltd: "#7e22ce",
  l10: "#c2410c",
  ss: "#0d9488",
  rev: "#f59e0b",
};

export const ShooterProgressChart = ({ division, memberNumber }) => {
  const [mode, setMode] = useState(defaultScoresMode);
  const { json: dataRaw, loading } = useApi(
    `/shooters/all/${memberNumber}/chart/progress/${mode.toLowerCase()}`,
    { placeholderData: keepPreviousData },
  );
  if (loading && !dataRaw) {
    return <ProgressSpinner />;
  }

  if (!dataRaw) {
    return null;
  }

  const dataForDivision = div =>
    dataRaw[div].map(c => ({
      x: new Date(new Date(c.sd).toLocaleDateString("en-us", { timeZone: "UTC" })),
      y: c.p.toFixed(2),
    }));
  const allDivisionsData = uspsaDivShortNames.map(div => dataForDivision(div)).flat();
  const high = allDivisionsData.toSorted((a, b) => b.y - a.y)[0];

  return (
    <>
      <div className="flex pb-0 pt-1 bg-primary-reverse justify-content-around">
        <ScoresModeSelectButton
          className="compact bg-primary-reverse right-0"
          size={10}
          style={{ margin: "auto", transform: "scale(0.65)" }}
          mode={mode}
          setMode={setMode}
        />
      </div>
      <div className="relative bg-primary-reverse flex-grow-1">
        <Line
          style={{ width: "100%", height: "100%", position: "relative" }}
          adapters={null}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                max: (Number(high?.y) || 100) + 10,
                min: 0,
              },
              x: {
                type: "time",
                min: "auto",
              },
            },
            elements: {
              line: {
                fill: "blue",
                color: "blue",
                borderColor: "pink",
                borderWidth: 1,
              },
              point: {
                label: "kek",
                radius: 2,
              },
            },
            plugins: {
              zoom: {
                pan: { enabled: false },
                zoom: {
                  mode: "xy",
                  wheel: {
                    enabled: false,
                  },
                  pinch: {
                    enabled: false,
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label: ({ dataset, raw: { y } }) => `${y}% - ${dataset.label}`,
                  title: ([
                    {
                      raw: { x },
                    },
                  ]) => x.toLocaleDateString(),
                },
              },

              annotation: {
                annotations: !high
                  ? {}
                  : {
                      highLine: {
                        type: "line",
                        yMin: high.y || 0,
                        yMax: high.y || 0,
                        borderColor: r1annotationColor(1.0),
                        borderWidth: 1,
                      },
                      highLabel: {
                        type: "label",
                        xValue: high.x || 0,
                        yValue: high.y || 0,
                        color: r1annotationColor(1.0),
                        position: "end",
                        content: [`High ${high.y}%`],
                        font: {
                          size: 11,
                        },
                      },
                    },
              },
            },
          }}
          data={{
            datasets: uspsaDivShortNames
              .map(div => ({
                label: div,
                data: dataForDivision(div),
                backgroundColor: paletteA[div], //"#ae9ef1",
                borderColor: paletteB[div], //"#ca258a",
              }))
              .filter(d => d.data.length),
          }}
        />
        {loading && (
          <ProgressSpinner className="absolute m-auto top-0 bottom-0 left-0 right-0" />
        )}
      </div>
    </>
  );
};

export default ShooterProgressChart;
