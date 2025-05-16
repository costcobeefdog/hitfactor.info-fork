export const scoresModes = ["combined", "classifiers", "majors"] as const;

export const ScoreSourceClassifier = "Stage Score" as const;
export const ScoreSourceMajor = "Major Match" as const;
export const scoresSources = [ScoreSourceClassifier, ScoreSourceMajor] as const;

export type ScoresMode = (typeof scoresModes)[number];
export type ScoreSource = (typeof scoresSources)[number];
