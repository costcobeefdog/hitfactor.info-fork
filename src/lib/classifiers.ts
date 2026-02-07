/**
 * Classifier data utilities - ported from api/src/dataUtil/classifiersData.ts
 */

import classifiersJSON from "../../data/classifiers/classifiers.json";

export type Scoring = "Virginia" | "Comstock" | "Fixed Time" | "Time Plus";

export interface ClassifierJSON {
  id: string;
  classifier: string;
  name: string;
  scoring: Scoring;
  version?: string;
  rounds?: string;
  link?: string;
  thumb?: string;
  image_file?: string;
  wsb_file?: string;
}

export interface ClassifierBasicInfo extends ClassifierJSON {
  code: string;
}

export const classifiers: ClassifierJSON[] =
  classifiersJSON.classifiers as ClassifierJSON[];

export const classifiersByNumber: Record<string, ClassifierJSON> =
  classifiers.reduce(
    (acc, cur) => {
      acc[cur.classifier] = cur;
      return acc;
    },
    {} as Record<string, ClassifierJSON>,
  );

export const basicInfoForClassifier = (c: ClassifierJSON): ClassifierBasicInfo => ({
  id: c?.id,
  code: c?.classifier,
  classifier: c?.classifier,
  name: c?.name,
  scoring: c?.scoring,
});

export const basicInfoForClassifierCode = (
  classifierCode: string,
): ClassifierBasicInfo | undefined => {
  if (!classifierCode) {
    return undefined;
  }
  const c = classifiers.find((cur) => cur.classifier === classifierCode);
  if (!c) {
    return undefined;
  }
  return basicInfoForClassifier(c);
};

// SCSA peak times and points
export const ScsaPointsPerString = 25;

export const scsaHhfToPeakTime = (classifier: string, hf: number): number => {
  const numScoringStrings = classifier === "SC-104" ? 3 : 4;
  return Number(
    parseFloat(String(ScsaPointsPerString / (hf / numScoringStrings))).toFixed(
      2,
    ),
  );
};
