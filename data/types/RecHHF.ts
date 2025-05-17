export interface RecHHF {
  classifier: string;
  division: string;
  classifierDivision: string;

  oldHHF: number; //< before CC HHF
  curHHF: number;
  recHHF: number;

  // Weibull
  k: number;
  lambda: number;
  wbl1HHF: number;
  wbl3HHF: number;
  wbl5HHF: number;
  wbl15HHF: number;
  kurtosis: number;
  skewness: number;
  meanSquaredError: number;
  meanAbsoluteError: number;
  superMeanSquaredError: number;
  superMeanAbsoluteError: number;
  maxError: number;

  // Prod 10 vs 15 extras
  prod10HHF?: number;
  prod15HHF?: number;

  // LO: LOCO vs LO vs CO extras
  loHHF?: number;
  locoHHF?: number;
  coHHF?: number;
}
