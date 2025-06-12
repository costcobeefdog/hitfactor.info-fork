import { Menu } from "primereact/menu";
import { TabPanel } from "primereact/tabview";
import { useRef } from "react";

import { sportName } from "../../../shared/constants/divisions";
import features from "../../../shared/features";

const SportSelector = ({ sportCode, setSportCode, uspsaOnly, disableSCSA, hideSCSA }) => {
  const menu = useRef(null);
  const items = [
    {
      items: [
        {
          label: "USPSA",
          className: sportCode === "uspsa" && "focused-menu-item",
          command: () => setSportCode("uspsa"),
        },
        ...(hideSCSA
          ? []
          : [
              {
                label: "Steel Challenge",
                className: sportCode === "scsa" && "focused-menu-item",
                command: () => setSportCode("scsa"),
                disabled: !!disableSCSA,
              },
            ]),
        {
          label: "Hit-Factor Unified",
          className: sportCode === "hfu" && "focused-menu-item",
          command: () => setSportCode("hfu"),
        },
        {
          label: "PCSL (Coming Soon)",
          command: () => setSportCode("pcsl"),
          disabled: true,
        },
      ],
    },
  ];

  if (!features.hfu || uspsaOnly) {
    return null;
  }

  return (
    <div className="card flex justify-content-center">
      <Menu model={items} popup ref={menu} />
      <a
        role="tab"
        className="p-tabview-nav-link mr-4"
        tabIndex="-1"
        onClick={e => {
          e.preventDefault();

          menu.current.toggle(e);
          setTimeout(() => document.activeElement?.blur(), 0);
        }}
        aria-haspopup
      >
        <span className="p-tabview-title">{sportName(sportCode)}</span>
        <span className="pi pi-chevron-down ml-2 text-sm" />
      </a>
    </div>
  );
};

export const SportSelectorTabPanel = ({
  sportCode,
  setSportCode,
  uspsaOnly,
  disableSCSA,
  hideSCSA,
}) => (
  <TabPanel
    header="Mode"
    headerTemplate={
      <SportSelector
        sportCode={sportCode}
        setSportCode={setSportCode}
        uspsaOnly={uspsaOnly}
        disableSCSA={disableSCSA}
        hideSCSA={hideSCSA}
      />
    }
  />
);
