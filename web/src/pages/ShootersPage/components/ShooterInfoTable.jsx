import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Divider } from "primereact/divider";

import {
  hfuDivisionsShortNames,
  nameForDivision,
  sportForDivision,
  uspsaDivShortNames,
} from "../../../../../api/src/dataUtil/divisions";
import ShooterChart from "../../../components/chart/ShooterChart";
import { ShooterProgressChart } from "../../../components/chart/ShooterProgressChart";
import { renderPercent } from "../../../components/Table";

const tableNameForDiv = {
  opn: "Open",
  ltd: "Lim",
  l10: "L10",
  prod: "Prod",
  rev: "Revo",
  ss: "SS",
  co: "CO",
  pcc: "PCC",
  lo: "LO",

  comp: "Comp",
  opt: "Optics",
  irn: "Irons",
  car: "Carbine",
};

const toFixedWithSuffixValueOrPlaceholder = (value, length, suffix, empty = "—") => {
  if (!value) {
    return empty;
  }

  return value.toFixed(length) + suffix;
};

const cardRow = (classificationByDivision, div) => {
  const {
    age,
    reclassificationsRecPercentUncappedCurrent,
    reclassificationsRecPercentUncappedHigh,
    reclassificationsMajorsCurrent,
    reclassificationsClassifiersCurrent,
  } = classificationByDivision?.[div] || {
    hqClass: "U",
    current: 0,
    age: null,
    reclassificationsCurPercentCurrent: 0,
    reclassificationsRecPercentCurrent: 0,
    reclassificationsMajorsCurrent: 0,
    reclassificationsClassifiersCurrent: 0,
  };
  return {
    division: tableNameForDiv[div],
    recHigh: reclassificationsRecPercentUncappedHigh || -1,
    recCur: reclassificationsRecPercentUncappedCurrent || -1,
    majors: reclassificationsMajorsCurrent || -1,
    classifiers: reclassificationsClassifiersCurrent || -1,
    age: toFixedWithSuffixValueOrPlaceholder(age, 1, "mo"),
  };
};

const dateValue = value =>
  !value ? "" : new Date(value).toLocaleDateString("en-us", { timeZone: "UTC" });

export const ShooterInfoTable = ({ info, division, loading }) => {
  const sport = sportForDivision(division);
  const isHFU = sport === "hfu";
  const divisions = isHFU ? hfuDivisionsShortNames : uspsaDivShortNames;
  const isUspsa = sport === "uspsa";
  const isSCSA = sport === "scsa";

  return (
    <div className="h-full flex flex-wrap">
      <div className="flex-grow-1 md:w-min md:max-w-min flex flex-column justify-content-between md:mr-2">
        {isUspsa && (
          <DataTable
            loading={loading}
            className="less-padding-table text-xs md:text-base"
            size="small"
            showHeaders={false}
            value={
              loading || !info
                ? []
                : [
                    {
                      k: "ID",
                      v: info?.data?.member_id,
                    },
                    {
                      k: "Number",
                      v: info?.memberNumber,
                    },
                    {
                      k: "Joined",
                      v: dateValue(info?.data?.joined_date),
                    },
                  ]
            }
          >
            <Column field="k" />
            <Column field="v" align="right" />
          </DataTable>
        )}
        {(isUspsa || isHFU) && (
          <DataTable
            className="less-padding-table pt-3"
            size="small"
            stripedRows
            value={
              loading || !info?.classificationByDivision
                ? []
                : divisions.map(d => cardRow(info.classificationByDivision, d))
            }
          >
            <Column field="division" header={isHFU ? "Division" : "Div"} />
            <Column
              align="center"
              field="recCur"
              header="Combined"
              body={renderPercent}
            />
            <Column
              align="center"
              field="classifiers"
              header="Classifiers"
              body={renderPercent}
            />
            <Column align="center" field="majors" header="Majors" body={renderPercent} />
            <Column field="age" header="Age" />
          </DataTable>
        )}
      </div>
      <Divider className="md:hidden my-3" />
      {!isSCSA && (
        <>
          <div className="w-12 md:w-5 flex-grow-1 flex flex-column">
            <ShooterProgressChart
              division={info.division}
              memberNumber={info.memberNumber}
            />
          </div>

          <Divider className="my-3 md:my-4" />

          <div className="w-12 h-32rem">
            <h4 className="w-full text-center bg-primary-reverse mb-0 mt-1 text-lg">
              Scores Distribution
            </h4>
            <div className="relative h-32rem bg-primary-reverse">
              <ShooterChart division={info.division} memberNumber={info.memberNumber} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default ShooterInfoTable;
