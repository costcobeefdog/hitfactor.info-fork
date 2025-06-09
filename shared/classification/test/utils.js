/*
interface MakeClassifierOptions {
  classifier?: string;
  division?: string;
  percent?: number;
  curPercent?: number;
  recPercent?: number;
  sd?: string;
}
  */

export const makeClassifier = ({
  classifier,
  percent,
  division,
  sd,
  curPercent,
  recPercent,
} /*: MakeClassifierOptions*/ = {}) => ({
  classifier: classifier ?? "99-11",
  sd: sd ?? "1/01/23",
  percent: percent ?? 74.999,
  division: division ?? "ss",
  curPercent: curPercent ?? 0,
  recPercent: recPercent ?? 0,
  source: "Stage Score",
});
