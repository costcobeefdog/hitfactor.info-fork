"use client";

import { TabView, TabPanel } from "primereact/tabview";
import { useEffect, useState } from "react";

import {
  divisionChangeMap,
  hfuDivisions,
  uspsaDivisions,
  scsaDivisions,
} from "@shared/constants/divisions";
import features from "@shared/features";

import usePreviousEffect from "@/hooks/usePreviousEffect";

type SportCode = "uspsa" | "hfu" | "scsa";

const divisionForSportAndIndex = (sport: SportCode, index: number): string => {
  if (sport === "hfu") {
    return hfuDivisions[index - 1]?.short.toLowerCase() || "";
  }
  if (sport === "scsa") {
    return scsaDivisions[index - 1]?.short.toLowerCase() || "";
  }
  return uspsaDivisions[index - 1]?.short_name?.toLowerCase?.() || "";
};

const sportAndDivisionIndexForDivision = (
  division: string | undefined,
): [SportCode, number] => {
  const hfuIndex = hfuDivisions.findIndex(
    c => c.short.toLowerCase() === (division || "invalid"),
  );
  if (hfuIndex >= 0) {
    return ["hfu", hfuIndex + 1];
  }

  const scsaIndex = scsaDivisions.findIndex(
    c => c.short?.toLowerCase() === (division || "invalid"),
  );
  if (scsaIndex >= 0) {
    return ["scsa", scsaIndex + 1];
  }

  const uspsaIndex = uspsaDivisions.findIndex(
    c => c?.short_name?.toLowerCase() === (division || "invalid"),
  );
  if (uspsaIndex >= 0) {
    return ["uspsa", uspsaIndex + 1];
  }

  if (features.scsaOnly) {
    return ["scsa", -1];
  }

  return ["uspsa", -1];
};

export const defaultDivisionForSport = (sport: SportCode): string => {
  switch (sport) {
    case "scsa":
      return "scsa_opn";
    case "uspsa":
      return "opn";
    case "hfu":
      return "comp";
    default:
      return "";
  }
};

interface DivisionNavigationProps {
  division?: string;
  onSelect: (division: string, sport?: SportCode) => void;
  uspsaOnly?: boolean;
  forcedDivision?: string;
}

export const DivisionNavigation = ({
  division,
  onSelect,
  uspsaOnly,
  forcedDivision,
}: DivisionNavigationProps) => {
  const [initialSport, initialDivisionIndex] = sportAndDivisionIndexForDivision(
    forcedDivision || division,
  );
  const [sportCode, setSportCode] = useState<SportCode>(initialSport);
  const [activeIndex, setActiveIndex] = useState(initialDivisionIndex);

  useEffect(() => {
    const [sport, divisionIndex] = sportAndDivisionIndexForDivision(division);
    if (features.scsaOnly || (features.hfu && !uspsaOnly)) {
      setActiveIndex(divisionIndex);
      setSportCode(sport);
    } else if (sport === "hfu") {
      setSportCode("uspsa");
      setActiveIndex(1);
      onSelect("opn", "uspsa");
    } else if (sport === "scsa") {
      setSportCode("scsa");
      setActiveIndex(1);
      onSelect("scsa_opn", "scsa");
    }
  }, [division]); // eslint-disable-line react-hooks/exhaustive-deps

  usePreviousEffect(
    ([prevSportCode]: [SportCode]) => {
      if (prevSportCode === sportCode) {
        return;
      }

      const prevDivision = divisionForSportAndIndex(prevSportCode, activeIndex);
      const changeMap = divisionChangeMap[sportCode] as
        | Record<string, string>
        | undefined;
      const newDivision = changeMap?.[prevDivision] || defaultDivisionForSport(sportCode);
      const [newSport, newIndex] = sportAndDivisionIndexForDivision(newDivision);

      setActiveIndex(newIndex >= 0 ? newIndex : 1);
      onSelect(newDivision, newSport);
    },
    [sportCode] as [SportCode],
  );

  const tabViewItems = [
    ...(sportCode !== "hfu"
      ? []
      : hfuDivisions.map(hfuDiv => (
          <TabPanel
            key={hfuDiv.short}
            header={hfuDiv.long}
            className="p-0 text-sm md:text-base"
          />
        ))),
    ...(sportCode !== "uspsa"
      ? []
      : uspsaDivisions.map(uspsaDiv => (
          <TabPanel
            disabled={
              !!forcedDivision && uspsaDiv.short_name.toLowerCase() !== forcedDivision
            }
            key={uspsaDiv.id}
            header={uspsaDiv.long_name}
            className="p-0 text-sm md:text-base"
          />
        ))),
    ...(sportCode !== "scsa"
      ? []
      : scsaDivisions.map(curDiv => (
          <TabPanel
            disabled={!!forcedDivision && curDiv.short !== forcedDivision}
            key={curDiv.long}
            header={curDiv.long}
            className="p-0 text-sm md:text-base"
          />
        ))),
  ];

  return (
    <div className="p-0 md:px-4">
      <TabView
        panelContainerClassName="p-0 md:px-8"
        activeIndex={activeIndex}
        onTabChange={({ index }) => {
          const newDivision = divisionForSportAndIndex(sportCode, index);
          onSelect?.(newDivision);
          setActiveIndex(index);
        }}
      >
        {null}
        {tabViewItems}
      </TabView>
      {activeIndex < 0 && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          Select Division to Start
        </div>
      )}
    </div>
  );
};

export default DivisionNavigation;
