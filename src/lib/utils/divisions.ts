/**
 * Division utilities - ported from shared/constants/divisions.ts
 */

/** USPSA division short names */
export const uspsaDivShortNames = [
  "opn",
  "ltd",
  "l10",
  "prod",
  "rev",
  "ss",
  "co",
  "lo",
  "pcc",
];

/** HFU divisions that need minor HF calculation */
export const hfuDivisionsShortNamesThatNeedMinorHF = ["comp", "irn"];

/** HFU division compatibility map */
export const hfuDivisionCompatabilityMap: Record<string, string> = {
  // from USPSA
  opn: "comp",
  co: "opt",
  lo: "opt",
  ltd: "irn",
  l10: "irn",
  prod: "irn",
  ss: "irn",
  rev: "irn",
  pcc: "car",
  // from PCSL
  pcsl_comp: "comp",
  pcsl_po: "opt",
  pcsl_pi: "irn",
  pcsl_pcc: "car",
  pcsl_acp: "opt",
};

/** Divisions that should NOT be used to calculate RecHHF for HFU divisions */
export const hfuDivisionRecHHFExclusion = [
  "pcsl_acp",
  "l10",
  "prod",
  "ss",
  "rev",
];

/**
 * Invert the HFU division compatibility map.
 */
export const hfuDivisionCompatabilityMapInversion = (
  excludedDivisions: string[] = [],
): Record<string, string[]> =>
  Object.keys(hfuDivisionCompatabilityMap)
    .filter((div) => !excludedDivisions.includes(div))
    .reduce(
      (acc, curKey) => {
        const curValue = hfuDivisionCompatabilityMap[curKey];
        const invertedArray = acc[curValue] || [curValue];
        invertedArray.push(curKey);
        acc[curValue] = invertedArray;
        return acc;
      },
      {} as Record<string, string[]>,
    );

/** Inversion for displaying scores (includes all compatible divisions) */
export const hfuDivisionExplosionForScores =
  hfuDivisionCompatabilityMapInversion();

/** Reduced inversion for RecHHF calculation */
export const hfuDivisionExplosionForRecHHF =
  hfuDivisionCompatabilityMapInversion(hfuDivisionRecHHFExclusion);

/**
 * Get divisions to query for scores based on a division input.
 */
export const divisionsForScoresAdapter = (division: string): string[] => {
  if (division === "all") {
    return uspsaDivShortNames;
  }
  const hfu = hfuDivisionExplosionForScores[division];
  if (hfu) {
    return hfu;
  }
  return [division];
};

// L10 optics effective timestamp: January 31st 2025
export const L10_OPTICS_EFFECTIVE_TS = 1738281600000;
