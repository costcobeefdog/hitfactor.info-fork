/**
 * @file Types for data from USPSA API and related adapters.
 */

/* used for both USPSA and SCSA, based on USPSA one */
export interface HHFJSON {
  id: string;
  classifier: string; // number id of classifier in classifers.json
  hhf: string; // number in toFixed(4)
  updated: string; // e.g. "2022-03-01 21:39:39"
}

/**
 * As-is from USPSA API Response
 * fields that are not set in SCSA adapter
 */
export interface USPSAHHFJSON extends HHFJSON {
  division: string; // number id of division in division.json
  updated: string; // date in "2022-03-01 21:39:59" format
}

export type USPSAHHFJSONDivision = string;

export const ClassificationLetters = ["U", "X", "D", "C", "B", "A", "M", "GM"] as const;
export type ClassificationLetter = (typeof ClassificationLetters)[number];

export interface ActiveMember {
  generated: Date;
  memberId: number;
  memberNumber: string;

  expires: Date;

  co: ClassificationLetter;
  l10: ClassificationLetter;
  lo: ClassificationLetter;
  ltd: ClassificationLetter;
  opn: ClassificationLetter;
  pcc: ClassificationLetter;
  prod: ClassificationLetter;
  rev: ClassificationLetter;
  ss: ClassificationLetter;
}
