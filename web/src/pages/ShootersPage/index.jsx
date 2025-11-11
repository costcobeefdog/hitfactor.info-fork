import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDebouncedCallback } from "use-debounce";
import { v4 as randomUUID } from "uuid";

import {
  ScoresModeSelectButton,
  defaultScoresMode,
} from "@web/components/ScoresModeSelectButton";

import ShooterInfoTable from "./components/ShooterInfoTable";
import ShooterMatchScoresTable from "./components/ShooterMatchesTable";
import ShooterRunsTable from "./components/ShooterRunsTable";
import ShootersTable from "./components/ShootersTable";

import { nameForDivision } from "../../../../api/src/dataUtil/divisions";
import { DivisionNavigation } from "../../components";
import { renderPercent } from "../../components/Table";
import { postApi, useApi } from "../../utils/client";
import { useIsSCSA } from "../../utils/useIsSCSA";

// TODO: shooters table for single classifier? # attempts, low HF, high HF, same for percent, same for curPercent
// TODO: all classifiers total number of reshoots (non-uniqueness)

const ShootersPage = () => {
  const navigate = useNavigate();
  const { division, memberNumber } = useParams();
  const onDivisionSelect = useCallback(
    curDivision => navigate(`/shooters/${curDivision}/${memberNumber || ""}`),
    [navigate, memberNumber],
  );
  const onBackToShooters = useCallback(
    () => navigate(`/shooters/${division}`),
    [navigate, division],
  );

  return (
    <div>
      <DivisionNavigation onSelect={onDivisionSelect} disableSCSA />
      <div style={{ maxWidth: 1280, margin: "auto" }}>
        {division && !memberNumber && (
          <ShootersTable
            division={division}
            onShooterSelection={selectedMemberNumber =>
              navigate(`./${selectedMemberNumber}`)
            }
          />
        )}
        {memberNumber && (
          <ShooterRunsAndInfo
            division={division}
            memberNumber={memberNumber}
            onBackToShooters={onBackToShooters}
          />
        )}
      </div>
    </div>
  );
};

const useShooterTableData = ({ division, memberNumber }) => {
  const navigate = useNavigate();
  const apiEndpoint = !(division && memberNumber)
    ? null
    : `/shooters/${division}/${memberNumber}`;
  const { json: apiData, loading } = useApi(apiEndpoint);
  const info = useMemo(() => apiData?.info || {}, [apiData?.info]);
  const [classifiers, setClassifiers] = useState([]);
  const [lastFetchedClassifiers, setLastFetchedClassifiers] = useState([]);
  useEffect(() => {
    const classifiersFromApiData = apiData?.classifiers || [];
    setClassifiers(classifiersFromApiData);
    setLastFetchedClassifiers(classifiersFromApiData);
  }, [apiData?.classifiers]);

  // redirect to alternative memberNumber if available
  useEffect(() => {
    if (!!apiData?.info && !apiData?.info?.memberNumber && apiData?.altMemberNumber) {
      navigate(`/shooters/${division}/${apiData.altMemberNumber}`, { replace: true });
    }
  }, [apiData, navigate, division]);

  const downloadUrl = `/api/shooters/download/${division}/${memberNumber}`;

  const refetchWhatIfs = async whatIfs => {
    const canRefetch =
      whatIfs.length > 0 && whatIfs.every(c => !c.whatIf || (c.classifier && c.hf));
    if (canRefetch) {
      const result = await postApi("/shooters/whatif", {
        scores: whatIfs,
        division,
        memberNumber,
      });
      setClassifiers(result.scores);
      setWhatIf(result.whatIf);
    }
  };
  const debouncedRefetchWhatIfs = useDebouncedCallback(refetchWhatIfs, 500);

  const [whatIf, setWhatIf] = useState(null);
  const resetWhatIfs = useCallback(() => {
    setWhatIf(null);
    setClassifiers(lastFetchedClassifiers);
  }, [setWhatIf, setClassifiers, lastFetchedClassifiers]);

  useEffect(() => {
    setWhatIf(null);
  }, [division, memberNumber]);

  const addWhatIf = () => {
    setWhatIf(
      prevWhatIf =>
        prevWhatIf ?? {
          recPercent: info?.reclassificationsRecPercentCurrent || -1,
          curPercent: info?.reclassificationsCurPercentCurrent || -1,
        },
    );
    setClassifiers(existing => {
      const result = [
        { _id: randomUUID(), whatIf: true, sd: new Date().toISOString() },
        ...existing,
      ];
      return result;
    });
  };

  const updateWhatIfs = useCallback(
    (id, changes = {}, noDebounce = false) => {
      const whatIfClassifiers = classifiers
        .map(c => {
          if (c._id === id) {
            for (const key of Object.keys(changes)) {
              const value = changes[key];
              c[key] = value;
            }

            if (c.delete) {
              return null;
            }
          }

          return c;
        })
        .filter(Boolean);

      setClassifiers(whatIfClassifiers);
      if (noDebounce) {
        refetchWhatIfs(whatIfClassifiers);
      } else {
        debouncedRefetchWhatIfs(whatIfClassifiers);
      }
    },
    [classifiers], // eslint-disable-line
  );

  return {
    ...apiData,
    info,
    classifiers,
    downloadUrl,
    loading,
    whatIf,
    addWhatIf,
    updateWhatIfs,
    resetWhatIfs,
  };
};

export const ShooterRunsAndInfo = ({ division, memberNumber, onBackToShooters }) => {
  const navigate = useNavigate();
  const isSCSA = useIsSCSA();
  const { info, addWhatIf, resetWhatIfs, ...tableData } = useShooterTableData({
    division,
    memberNumber,
  });
  const { loading, whatIf } = tableData;
  const { name } = info;

  const [scoresMode, setScoresMode] = useState(defaultScoresMode);
  const [nerdMode, setNerdMode] = useState(false);

  useEffect(() => {
    if (whatIf) {
      setScoresMode("combined");
    }
  }, [whatIf]);

  return (
    <>
      <div className="flex justify-content-between align-items-center flex-wrap">
        <Button
          className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
          icon="pi pi-chevron-left text-sm md:text-lg lg:text-xl "
          rounded
          text
          aria-label="Back"
          onClick={onBackToShooters}
        >
          Shooters List
        </Button>
        <h3 className="mx-auto">
          {[memberNumber, name, nameForDivision(division)].filter(Boolean).join(" - ")}
        </h3>
      </div>
      {info?.note && (
        <Message severity="warn" className="mb-3 w-full" text={info?.note} />
      )}
      {!isSCSA ? (
        <ShooterInfoTable
          info={info}
          division={division}
          memberNumber={memberNumber}
          loading={loading}
        />
      ) : null}
      <Divider className="my-3 md:my-4" />
      <div className="relative">
        <div className="flex justify-content-around" />
      </div>
      <div className="flex relative justify-content-between align-items-center">
        <h4 className="block md:text-lg lg:text-xl">Scores</h4>
        {!whatIf && (
          <div className="absolute left-0 right-0 flex justify-content-center">
            <ScoresModeSelectButton
              className="compact text-xs md:text-base"
              mode={scoresMode}
              setMode={setScoresMode}
            />
          </div>
        )}
        {whatIf && (
          <div className="m-auto">
            <h5 className="block text-l md:inline mr-4">
              What If: {renderPercent(whatIf, { field: "recPercent" })}
            </h5>
          </div>
        )}
        <div>
          {whatIf && (
            <Button
              className="px-2 my-3 mr-2 text-xs md:text-sm"
              label="Reset"
              size="small"
              iconPos="left"
              icon="pi pi-refresh text-xs md:text-base"
              onClick={resetWhatIfs}
            />
          )}
          {!isSCSA && scoresMode === "combined" && (
            <Button
              className="compact px-2 my-3 text-xs md:text-sm"
              label="What If"
              size="small"
              iconPos="left"
              icon="pi pi-plus-circle text-xs md:text-base"
              onClick={addWhatIf}
            />
          )}
          {!isSCSA && scoresMode === "Majors" && (
            <div className="flex gap-2 align-items-center">
              Nerd Mode
              <Checkbox onChange={e => setNerdMode(e.checked)} checked={nerdMode} />
            </div>
          )}
        </div>
      </div>
      <ShooterRunsTable
        {...tableData}
        scoresMode={scoresMode}
        hidden={!["classifiers", "combined"].includes(scoresMode)}
        onClassifierSelection={number => navigate(`/classifiers/${division}/${number}`)}
        onClubSelection={club => navigate(`/clubs/${club}`)}
      />
      <ShooterMatchScoresTable
        mode="shooter"
        hidden={scoresMode !== "majors"}
        nerdMode={nerdMode}
        memberNumber={memberNumber}
        division={division}
      />
    </>
  );
};

export default ShootersPage;
