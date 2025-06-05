export const classPercents = [0, 2, 40, 60, 75, 85, 95] as const;
export const classLetters = ["U", "D", "C", "B", "A", "M", "GM"] as const;
export type ClassLetter = (typeof classLetters)[number];

const classLetterToPercentMap = Object.fromEntries(
  classLetters.map((letter, index) => [letter, classPercents[index]]),
);

/*const classPercentToLetterMap = Object.fromEntries(
  Object.entries(classLetterToPercentMap).map(pair => pair.toReversed()),
);*/

export const classForPercent = (curPercent: number): ClassLetter => {
  const index = classPercents.findLastIndex(percent => curPercent >= percent);
  if (index < 0) {
    return "U";
  }

  return classLetters[index];
};

export const percentForClass = (letter: ClassLetter): number =>
  classLetterToPercentMap[letter] ?? 0;

export const classLetterIndex = classification => classLetters.indexOf(classification);

export const eloRatings = [0, 700, 998, 1245, 1434, 1625] as const;
export const classForELO = (eloRating: number) => {
  const index = eloRatings.findLastIndex(elo => eloRating >= elo);
  if (index < 0) {
    return "U";
  }

  return classLetters[index];
};
