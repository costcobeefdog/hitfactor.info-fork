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

  // Extra division HHFs for comparison
  prod10HHF?: number;
  prod10MajorHHF: number;
  prod15HHF?: number;
  loHHF?: number;
  locoHHF?: number;
  locoMajorHHF?: number;
  coHHF?: number;
  opnHHF?: number;
  ltdHHF?: number;
  schizoHHF?: number;
  prophecyHHF?: number;
}
