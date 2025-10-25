export interface MatchScore {
  upload: string;
  division: string;
  uploadDivision: string;
  memberNumber: string;
  originalMemberNumber?: string;
  memberNumberDivision: string;
  shooterFullName?: string;
  date: Date;

  matchPercent: number;
  percentOfPossible: number;

  // after backfill
  shooterRecPercentHistorical?: number;
  shooterRecPercentHistoricalHigh?: number;
  shooterRecPercentHistoricalAge?: number;

  shooterMajorsPercentHistorical?: number;
  shooterMajorsPercentHistoricalHigh?: number;
  shooterMajorsPercentHistoricalAge?: number;

  shooterClassifiersPercentHistorical?: number;
  shooterClassifiersPercentHistoricalHigh?: number;
  shooterClassifiersPercentHistoricalAge?: number;
}

export const maxPercentDifference = 15;
export const maxAge = 18; // months

// minus 5 for both match and classification
export const grandmasterPercent = 90;
export const masterPercent = 80;

/**
 * Picks majors or combined recommended classification from the MatchScore, depending on age
 * eligibility (majors won't be used if too old).
 *
 * @returns number majors or combined classification, or 0 if no classification is eligible
 */
export const pickEffectiveClassification = (c: MatchScore) => {
  const majors = c.shooterMajorsPercentHistorical ?? 0;
  const combined = c.shooterRecPercentHistorical ?? 0;

  const majorsAge = c.shooterMajorsPercentHistoricalAge ?? 999;
  const combinedAge = c.shooterRecPercentHistoricalAge ?? 999;

  const canUseMajors = majorsAge <= maxAge && majors > 0;
  const canUseCombined = combinedAge <= maxAge && combined > 0;
  const canUseEffective = canUseMajors || canUseCombined;

  if (!canUseEffective) {
    return 0;
  }

  if (canUseMajors) {
    return majors;
  }

  return combined;
};

export const eligibilityFilter = (c: MatchScore) => {
  const effective = pickEffectiveClassification(c);
  if (effective <= 0) {
    return false;
  }

  const matchWithinEffectiveDeviation =
    Math.abs(c.matchPercent - effective) <= maxPercentDifference;

  return c.matchPercent > 0 && matchWithinEffectiveDeviation;
};
