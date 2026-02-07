"use client";

import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Divider } from "primereact/divider";
import { Message } from "primereact/message";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import DivisionNavigation from "@/components/DivisionNavigation";
import { useApi } from "@/hooks/useApi";

// Placeholder component - will be migrated from web/src
const ShootersTable = ({
  division,
  onShooterSelection,
}: {
  division: string;
  onShooterSelection: (memberNumber: string) => void;
}) => {
  const { json: data, loading } = useApi<{
    shooters?: Array<{
      memberNumber: string;
      name: string;
      class: string;
      current: number;
    }>;
  }>(`/shooters/${division}`);

  if (loading) {
    return <div className="p-4 text-center">Loading shooters...</div>;
  }

  return (
    <div className="p-4">
      <h2>Shooters in {division?.toUpperCase()}</h2>
      <div className="grid">
        {data?.shooters?.slice(0, 50).map(s => (
          <div key={s.memberNumber} className="col-12 md:col-6 lg:col-4 p-2">
            <Button
              className="w-full text-left"
              text
              onClick={() => onShooterSelection(s.memberNumber)}
            >
              {s.memberNumber} - {s.name} ({s.class} {s.current}%)
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ShooterInfoTable = ({
  info,
  loading,
}: {
  info: Record<string, unknown>;
  division?: string;
  memberNumber?: string;
  loading: boolean;
}) => {
  if (loading) {
    return <div className="p-4">Loading info...</div>;
  }

  return (
    <div className="p-4">
      <pre className="text-sm">{JSON.stringify(info, null, 2)}</pre>
    </div>
  );
};

const ShooterRunsTable = ({
  classifiers,
  loading,
  hidden,
  onClassifierSelection,
}: {
  classifiers: Array<{ classifier: string; hf: number; percent: number }>;
  loading: boolean;
  scoresMode?: string;
  hidden: boolean;
  onClassifierSelection: (classifier: string) => void;
  onClubSelection?: (club: string) => void;
}) => {
  if (hidden) {
    return null;
  }
  if (loading) {
    return <div className="p-4 text-center">Loading runs...</div>;
  }

  return (
    <div className="p-4">
      <h3>Classifier Scores</h3>
      <div className="text-sm">
        {classifiers?.slice(0, 20).map((c, i) => (
          <div key={i} className="flex gap-2 py-1">
            <Button text size="small" onClick={() => onClassifierSelection(c.classifier)}>
              {c.classifier}
            </Button>
            <span>HF: {c.hf}</span>
            <span>%: {c.percent}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ShooterMatchScoresTable = ({
  hidden,
}: {
  mode?: string;
  hidden: boolean;
  nerdMode?: boolean;
  memberNumber?: string;
  division?: string;
}) => {
  if (hidden) {
    return null;
  }

  return (
    <div className="p-4">
      <h3>Major Match Scores</h3>
      <p className="text-sm text-600">Match scores will be displayed here</p>
    </div>
  );
};

interface ShooterData {
  info?: Record<string, unknown>;
  classifiers?: Array<{ classifier: string; hf: number; percent: number; _id: string }>;
  altMemberNumber?: string;
}

const useShooterTableData = ({
  division,
  memberNumber,
}: {
  division?: string;
  memberNumber?: string;
}) => {
  const router = useRouter();
  const apiEndpoint = !(division && memberNumber)
    ? null
    : `/shooters/${division}/${memberNumber}`;
  const { json: apiData, loading } = useApi<ShooterData>(apiEndpoint);
  const info = useMemo(() => apiData?.info || {}, [apiData?.info]);
  const [classifiers, setClassifiers] = useState<ShooterData["classifiers"]>([]);
  const [lastFetchedClassifiers, setLastFetchedClassifiers] = useState<
    ShooterData["classifiers"]
  >([]);

  useEffect(() => {
    const classifiersFromApiData = apiData?.classifiers || [];
    setClassifiers(classifiersFromApiData);
    setLastFetchedClassifiers(classifiersFromApiData);
  }, [apiData?.classifiers]);

  // redirect to alternative memberNumber if available
  useEffect(() => {
    if (apiData?.info && !apiData?.info?.memberNumber && apiData?.altMemberNumber) {
      router.replace(`/shooters/${division}/${apiData.altMemberNumber}`);
    }
  }, [apiData, router, division]);

  const downloadUrl = `/api/shooters/download/${division}/${memberNumber}`;

  const [whatIf, setWhatIf] = useState<{ recPercent: number; curPercent: number } | null>(
    null,
  );

  const resetWhatIfs = useCallback(() => {
    setWhatIf(null);
    setClassifiers(lastFetchedClassifiers);
  }, [lastFetchedClassifiers]);

  useEffect(() => {
    setWhatIf(null);
  }, [division, memberNumber]);

  const addWhatIf = () => {
    const infoTyped = info as {
      reclassificationsRecPercentCurrent?: number;
      reclassificationsCurPercentCurrent?: number;
    };
    setWhatIf(
      prevWhatIf =>
        prevWhatIf ?? {
          recPercent: infoTyped?.reclassificationsRecPercentCurrent || -1,
          curPercent: infoTyped?.reclassificationsCurPercentCurrent || -1,
        },
    );
    setClassifiers(existing => {
      const result = [
        { _id: crypto.randomUUID(), classifier: "", hf: 0, percent: 0 },
        ...(existing || []),
      ];
      return result;
    });
  };

  return {
    ...apiData,
    info,
    classifiers,
    downloadUrl,
    loading,
    whatIf,
    addWhatIf,
    resetWhatIfs,
  };
};

interface ShooterRunsAndInfoProps {
  division: string;
  memberNumber: string;
  onBackToShooters: () => void;
}

const ShooterRunsAndInfo = ({
  division,
  memberNumber,
  onBackToShooters,
}: ShooterRunsAndInfoProps) => {
  const router = useRouter();
  const { info, addWhatIf, resetWhatIfs, ...tableData } = useShooterTableData({
    division,
    memberNumber,
  });
  const { loading, whatIf, classifiers } = tableData;
  const infoTyped = info as { name?: string; note?: string };
  const { name } = infoTyped;

  const [scoresMode, setScoresMode] = useState("combined");
  const [nerdMode] = useState(false);

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
          {[memberNumber, name, division?.toUpperCase()].filter(Boolean).join(" - ")}
        </h3>
      </div>
      {infoTyped?.note && (
        <Message severity="warn" className="mb-3 w-full" text={infoTyped?.note} />
      )}
      <ShooterInfoTable
        info={info}
        division={division}
        memberNumber={memberNumber}
        loading={loading}
      />
      <Divider className="my-3 md:my-4" />
      <div className="flex relative justify-content-between align-items-center">
        <h4 className="block md:text-lg lg:text-xl">Scores</h4>
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
          {scoresMode === "combined" && (
            <Button
              className="compact px-2 my-3 text-xs md:text-sm"
              label="What If"
              size="small"
              iconPos="left"
              icon="pi pi-plus-circle text-xs md:text-base"
              onClick={addWhatIf}
            />
          )}
        </div>
      </div>
      <ShooterRunsTable
        classifiers={classifiers || []}
        loading={loading}
        scoresMode={scoresMode}
        hidden={!["classifiers", "combined"].includes(scoresMode)}
        onClassifierSelection={number =>
          router.push(`/classifiers/${division}/${number}`)
        }
        onClubSelection={club => router.push(`/clubs/${club}`)}
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

interface ShootersPageProps {
  params: Promise<{ params?: string[] }>;
}

const ShootersPage = ({ params }: ShootersPageProps) => {
  const router = useRouter();
  const resolvedParams = use(params);
  const [division, memberNumber] = resolvedParams?.params || [];

  const onDivisionSelect = useCallback(
    (curDivision: string) =>
      router.push(`/shooters/${curDivision}/${memberNumber || ""}`),
    [router, memberNumber],
  );

  const onBackToShooters = useCallback(
    () => router.push(`/shooters/${division}`),
    [router, division],
  );

  return (
    <div>
      <DivisionNavigation division={division} onSelect={onDivisionSelect} />
      <div style={{ maxWidth: 1280, margin: "auto" }}>
        {division && !memberNumber && (
          <ShootersTable
            division={division}
            onShooterSelection={selectedMemberNumber =>
              router.push(`/shooters/${division}/${selectedMemberNumber}`)
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

export default ShootersPage;
