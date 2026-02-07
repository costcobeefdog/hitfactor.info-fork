"use client";

import { Checkbox } from "primereact/checkbox";
import { SelectButton } from "primereact/selectbutton";
import { TabView, TabPanel } from "primereact/tabview";
import { useState } from "react";
import { PieChart } from "react-minimal-pie-chart";

import { useApi } from "@/hooks/useApi";

// Color mapping for classification classes
const bgColorForClass: Record<string, string> = {
  GM: "#ff4444",
  M: "#ff8844",
  A: "#ffcc44",
  B: "#44cc44",
  C: "#4488ff",
  D: "#8844ff",
  U: "#888888",
};

const tabPanelStyle = {
  className: "p-0 m-auto text-sm md:text-base",
  style: { maxWidth: 1280 },
};

interface ClassificationsData {
  [division: string]: {
    GM: number;
    M: number;
    A: number;
    B: number;
    C: number;
    D: number;
    U: number;
  };
}

interface ApiData {
  byCurrent?: ClassificationsData;
  byHigh?: ClassificationsData;
}

interface ClassificationsChartProps {
  division: string;
  includeU: boolean;
  apiData: ClassificationsData | undefined;
  onClick?: () => void;
}

const ClassificationsChart = ({
  division,
  includeU,
  apiData,
  onClick,
}: ClassificationsChartProps) => {
  const valueFor = (letter: keyof ClassificationsData[string]) =>
    apiData?.[division]?.[letter] ?? 0;
  const totalInDivision =
    valueFor("GM") +
    valueFor("M") +
    valueFor("A") +
    valueFor("B") +
    valueFor("C") +
    valueFor("D") +
    (!includeU ? 0 : valueFor("U"));

  const topA = (100 * (valueFor("GM") + valueFor("M") + valueFor("A"))) / totalInDivision;
  const topM = (100 * (valueFor("GM") + valueFor("M"))) / totalInDivision;

  const data = [
    ...(!includeU && !!apiData
      ? []
      : [
          {
            title: apiData ? "U" : "Loading",
            value: valueFor("U"),
            color: bgColorForClass.U,
          },
        ]),
    { title: apiData ? "D" : "", value: valueFor("D"), color: bgColorForClass.D },
    { title: apiData ? "C" : "", value: valueFor("C"), color: bgColorForClass.C },
    { title: apiData ? "B" : "", value: valueFor("B"), color: bgColorForClass.B },
    {
      title: apiData ? `A (Top ${topA.toFixed(1)}%)` : "",
      value: valueFor("A"),
      color: bgColorForClass.A,
    },
    {
      title: apiData ? `M (Top ${topM.toFixed(1)}%)` : "",
      value: valueFor("M"),
      color: bgColorForClass.M,
    },
    { title: apiData ? "GM" : "", value: valueFor("GM"), color: bgColorForClass.GM },
  ];

  return (
    <div style={{ margin: 8, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <PieChart
        data={data}
        style={{
          fontFamily: '"Nunito Sans", -apple-system, Helvetica, Arial, sans-serif',
          fontSize: "3.0px",
          fontWeight: "bold",
        }}
        lineWidth={60}
        label={({ dataEntry: { percentage, value, title } }) =>
          !value ? "" : `${title?.split(" ")[0]} ${value} (${percentage.toFixed(1)}%)`
        }
        labelPosition={72}
        labelStyle={dataIndex => ({
          fill: data[dataIndex].title === "GM" ? "red" : "#000",
          opacity: 0.75,
          pointerEvents: "none",
        })}
      />
    </div>
  );
};

const titleForDivMap: Record<string, string> = {
  opn: "Open",
  co: "Carry Optics",
  lo: "Limited Optics",
  pcc: "PCC",
  ltd: "Limited",
  l10: "Limited 10",
  prod: "Production",
  ss: "Single Stack",
  rev: "Revolver",
  all: "All Divisions",
};

const modeMap: Record<string, keyof ApiData> = {
  Current: "byCurrent",
  High: "byHigh",
};
const modes = Object.keys(modeMap);

const Row = ({ children, height }: { children: React.ReactNode; height?: number }) => (
  <div
    className="flex justify-content-center align-items-center flex-wrap"
    style={{ height }}
  >
    {children}
  </div>
);

const Column = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-column align-items-center text-center" style={{ width: 200 }}>
    {children}
  </div>
);

const ModeSwitch = ({
  modeOptions,
  mode,
  setMode,
}: {
  modeOptions: string[];
  mode: string;
  setMode: (mode: string) => void;
}) => (
  <div className="flex justify-content-center my-2">
    <SelectButton
      value={mode}
      onChange={e => setMode(e.value)}
      options={modeOptions.map(m => ({ label: m, value: m }))}
    />
  </div>
);

const StatsPage = () => {
  const [mode, setMode] = useState(modes[0]);
  const modeBucket = modeMap[mode];
  const [includeU, setChecked] = useState(false);
  const { json: apiData } = useApi<ApiData>("/classifications");
  const [selectedDivision, setSelectedDivision] = useState("all");

  return (
    <div className="p-0 md:px-4">
      <TabView panelContainerClassName="p-0 md:px-4">
        <TabPanel header="Pie Charts">
          <div {...tabPanelStyle}>
            <ModeSwitch modeOptions={modes} mode={mode} setMode={setMode} />
            <div className="card flex justify-content-center m-0 mt-4 gap-2">
              <span>Include Unclassified</span>
              <Checkbox
                onChange={e => setChecked(e.checked ?? false)}
                checked={includeU}
              />
            </div>
            <div>
              <Row height={400}>
                <div className="w-12 md:w-7 lg:w-5">
                  <ClassificationsChart
                    includeU={includeU}
                    division={selectedDivision}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("all")}
                  />
                </div>
              </Row>
              <Row>
                <span style={{ fontSize: 24 }}>{titleForDivMap[selectedDivision]}</span>
              </Row>
              <Row>
                <Column>
                  <ClassificationsChart
                    division="opn"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("opn")}
                  />
                  Open
                </Column>
                <Column>
                  <ClassificationsChart
                    division="co"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("co")}
                  />
                  Carry Optics
                </Column>
                <Column>
                  <ClassificationsChart
                    division="lo"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("lo")}
                  />
                  Limited Optics
                </Column>
              </Row>
              <Row>
                <Column>
                  <ClassificationsChart
                    division="pcc"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("pcc")}
                  />
                  PCC
                </Column>
                <Column>
                  <ClassificationsChart
                    division="ltd"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("ltd")}
                  />
                  Limited
                </Column>
                <Column>
                  <ClassificationsChart
                    division="l10"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("l10")}
                  />
                  Limited 10
                </Column>
              </Row>
              <Row>
                <Column>
                  <ClassificationsChart
                    division="prod"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("prod")}
                  />
                  Production
                </Column>
                <Column>
                  <ClassificationsChart
                    division="ss"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("ss")}
                  />
                  Single Stack
                </Column>
                <Column>
                  <ClassificationsChart
                    division="rev"
                    includeU={includeU}
                    apiData={apiData?.[modeBucket]}
                    onClick={() => setSelectedDivision("rev")}
                  />
                  Revolver
                </Column>
              </Row>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Distribution">
          <div {...tabPanelStyle}>
            <div className="p-4 text-center">
              <p className="text-600">Distribution charts will be displayed here</p>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="ELO">
          <div {...tabPanelStyle}>
            <div className="p-4 text-center">
              <p className="text-600">ELO ratings will be displayed here</p>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Divisions">
          <div {...tabPanelStyle}>
            <div className="p-4 text-center">
              <p className="text-600">
                Division popularity charts will be displayed here
              </p>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </div>
  );
};

export default StatsPage;
