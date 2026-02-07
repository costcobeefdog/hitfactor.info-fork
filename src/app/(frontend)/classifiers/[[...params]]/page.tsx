"use client";

import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { use, useCallback } from "react";

import { uspsaClassifiers2025 } from "@shared/constants/classifiers";

import DivisionNavigation from "@/components/DivisionNavigation";
import { useApi } from "@/hooks/useApi";

// Placeholder components - these will be migrated from web/src
const ClassifiersTable = ({
  division,
  onClassifierSelection,
}: {
  division: string;
  onClassifierSelection: (classifier: string) => void;
}) => {
  const { json: data, loading } = useApi<{
    classifiers?: Array<{ classifier: string; name: string }>;
  }>(`/classifiers/${division}`);

  if (loading) {
    return <div className="p-4 text-center">Loading classifiers...</div>;
  }

  return (
    <div className="p-4">
      <h2>Classifiers for {division?.toUpperCase()}</h2>
      <div className="grid">
        {data?.classifiers?.map(c => (
          <div key={c.classifier} className="col-12 md:col-6 lg:col-4 p-2">
            <Button
              className="w-full text-left"
              text
              onClick={() => onClassifierSelection(c.classifier)}
            >
              {c.classifier} - {c.name}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClassifierInfoTable = ({
  division,
  classifier,
  loading,
  hhfs,
  ...info
}: {
  division: string;
  classifier: string;
  loading: boolean;
  hhfs?: unknown;
  [key: string]: unknown;
}) => {
  if (loading) {
    return <div className="p-4">Loading info...</div>;
  }

  return (
    <div className="p-4">
      <pre className="text-sm">
        {JSON.stringify({ division, classifier, hhfs, ...info }, null, 2)}
      </pre>
    </div>
  );
};

const RunsTable = ({
  classifier,
  division,
  onShooterSelection,
}: {
  classifier: string;
  division: string;
  onShooterSelection: (memberNumber: string) => void;
  onClubSelection?: (club: string) => void;
  clubs?: unknown;
}) => {
  const { json: data, loading } = useApi<{
    scores?: Array<{ memberNumber: string; hf: number; percent: number }>;
  }>(`/classifiers/scores/${division}/${classifier}`);

  if (loading) {
    return <div className="p-4 text-center">Loading runs...</div>;
  }

  return (
    <div className="p-4">
      <h3>Runs</h3>
      <div className="text-sm">
        {data?.scores?.slice(0, 20).map((s, i) => (
          <div key={i} className="flex gap-2 py-1">
            <Button text size="small" onClick={() => onShooterSelection(s.memberNumber)}>
              {s.memberNumber}
            </Button>
            <span>HF: {s.hf}</span>
            <span>%: {s.percent}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const divisionsHaveSameClassifiers = (a: string, b: string) => {
  if (a.startsWith("scsa_") && !b.startsWith("scsa_")) {
    return false;
  }
  if (b.startsWith("scsa_") && !a.startsWith("scsa_")) {
    return false;
  }
  return true;
};

const useClassifierInfo = ({
  division,
  classifier,
}: {
  division?: string;
  classifier?: string;
}) => {
  const apiEndpoint = !(division && classifier)
    ? null
    : `/classifiers/info/${division}/${classifier}`;
  const { json: apiData, loading } = useApi<{
    info?: { hhfs?: unknown; clubs?: unknown; code?: string; name?: string };
  }>(apiEndpoint);
  const info = apiData?.info;
  const { hhfs, clubs } = info || {};

  return {
    loading,
    info,
    clubs,
    hhfs,
  };
};

interface ClassifierRunsAndInfoProps {
  division: string;
  classifier: string;
  onBackToClassifiers: () => void;
  onPrevClassifier: () => void;
  onNextClassifier: () => void;
  onShooterSelection: (memberNumber: string) => void;
  onClubSelection: (club: string) => void;
}

const ClassifierRunsAndInfo = ({
  division,
  classifier,
  onBackToClassifiers,
  onPrevClassifier,
  onNextClassifier,
  onShooterSelection,
  onClubSelection,
}: ClassifierRunsAndInfoProps) => {
  const { loading, info, clubs, hhfs } = useClassifierInfo({ classifier, division });
  const { code, name } = info || {};

  return (
    <>
      <div className="flex justify-content-between">
        <Button
          className="text-sm md:text-lg lg:text-xl font-bold px-0 md:px-2"
          icon="pi pi-chevron-left"
          rounded
          text
          aria-label="Back"
          onClick={onBackToClassifiers}
        >
          Classifiers List
        </Button>
        <h2 className="mx-auto md:text-xl lg:text-xxl w-max">
          {code} {name}
        </h2>
        <Button
          className="vertical-align-middle text-color"
          icon="pi pi-chevron-left"
          text
          aria-label="Previous"
          onClick={onPrevClassifier}
        />
        <Button
          className="vertical-align-middle text-color"
          icon="pi pi-chevron-right"
          text
          aria-label="Next"
          onClick={onNextClassifier}
        />
      </div>
      <ClassifierInfoTable
        division={division}
        classifier={classifier}
        loading={loading}
        hhfs={hhfs}
        {...info}
      />

      <RunsTable
        classifier={classifier}
        division={division}
        onShooterSelection={onShooterSelection}
        onClubSelection={onClubSelection}
        clubs={clubs}
      />
    </>
  );
};

interface ClassifiersPageProps {
  params: Promise<{ params?: string[] }>;
}

const ClassifiersPage = ({ params }: ClassifiersPageProps) => {
  const router = useRouter();

  // Handle async params with React.use()
  const resolvedParams = use(params);
  const [division, classifier] = resolvedParams?.params || [];

  const onDivisionSelect = useCallback(
    (newDivision: string) => {
      const newClassifier = divisionsHaveSameClassifiers(division || "", newDivision)
        ? classifier
        : "";
      router.push(`/classifiers/${newDivision}/${newClassifier || ""}`);
    },
    [router, division, classifier],
  );

  const onBackToClassifiers = useCallback(
    () => router.push(`/classifiers/${division}`),
    [router, division],
  );

  const onShooterSelection = (memberNumber: string) =>
    router.push(`/shooters/${division}/${memberNumber}`);

  const onClubSelection = (club: string) => router.push(`/clubs/${club}`);

  const handleNextClassifier =
    (increment = 1) =>
    () => {
      const newClassifierIndex = Math.min(
        uspsaClassifiers2025.length - 1,
        Math.max(0, uspsaClassifiers2025.findIndex(c => c === classifier) + increment),
      );
      const nextClassifier = uspsaClassifiers2025[newClassifierIndex];
      router.push(`/classifiers/${division}/${nextClassifier}`);
    };

  return (
    <div>
      <DivisionNavigation division={division} onSelect={onDivisionSelect} />
      <div style={{ maxWidth: 1280, margin: "auto" }}>
        {division && !classifier && (
          <ClassifiersTable
            division={division}
            onClassifierSelection={classifierCode =>
              router.push(`/classifiers/${division}/${classifierCode}`)
            }
          />
        )}
        {classifier && (
          <ClassifierRunsAndInfo
            division={division}
            classifier={classifier}
            onBackToClassifiers={onBackToClassifiers}
            onNextClassifier={handleNextClassifier()}
            onPrevClassifier={handleNextClassifier(-1)}
            onShooterSelection={onShooterSelection}
            onClubSelection={onClubSelection}
          />
        )}
      </div>
    </div>
  );
};

export default ClassifiersPage;
