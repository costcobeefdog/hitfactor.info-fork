import { ProgressSpinner } from "primereact/progressspinner";
import { useState } from "react";

import {
  ScoresModeSelectButton,
  defaultScoresMode,
} from "@web/components/ScoresModeSelectButton";

import { Line, r1annotationColor } from "./common";

import { keepPreviousData, useApi } from "../../utils/client";

export const ShooterProgressChart = ({ division, memberNumber }) => {
  const [mode, setMode] = useState(defaultScoresMode);
  const { json: dataRaw, loading } = useApi(
    `/shooters/${division}/${memberNumber}/chart/progress/${mode.toLowerCase()}`,
    { placeholderData: keepPreviousData },
  );
  if (loading && !dataRaw) {
    return <ProgressSpinner />;
  }

  if (!dataRaw) {
    return null;
  }

  const data = dataRaw.map(c => ({
    x: new Date(new Date(c.sd).toLocaleDateString("en-us", { timeZone: "UTC" })),
    y: c.p.toFixed(2),
  }));
  const high = data.toSorted((a, b) => b.y - a.y)[0];

  return (
    <>
      <div className="flex justify-content-around bg-primary-reverse">
        <h4 className="mb-0 mt-1 text-center text-lg">Classification Progress</h4>
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
                max: 120,
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
                  label: ({ raw: { y } }) => `${y}%`,
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
            datasets: [
              {
                label: "Rec. Percent",
                data,
                backgroundColor: "#ae9ef1",
                borderColor: "#ca258a",
              },
            ],
          }}
        />
        {loading && (
          <ProgressSpinner className="absolute m-auto top-0 bottom-0 left-0 right-0" />
        )}
        <div className="flex justify-content-around absolute right-0 left-0 top-0">
          <ScoresModeSelectButton
            className="compact bg-primary-reverse"
            size={10}
            style={{ margin: "auto", transform: "scale(0.65)" }}
            mode={mode}
            setMode={setMode}
          />
        </div>
      </div>
    </>
  );
};

export default ShooterProgressChart;
