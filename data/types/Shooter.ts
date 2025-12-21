// TODO: finish up the interfaces as schema
export interface Shooter {
  division: string;
  memberNumber: string;
  memberNumberDivision: string;
  name: string;
  memberId: string;
  current: number;
  high: number;
  hqClass: string;
  hqClassRank: number;
  class: string;

  note?: string; // warning displayed on shooter's profile

  elo?: number;

  // current
  reclassificationsRecPercentUncappedCurrent: number;
  recUncappedClassCurrent: string;
  recUncappedClassCurrentRank: number;

  // high
  reclassificationsRecPercentUncappedHigh: number;
  recUncappedClassHigh: string;
  recUncappedClassHighRank: number;

  // majors vs classifiers
  reclassificationsMajorsCurrent: number;
  reclassificationsClassifiersCurrent: number;

  age: number;
  age1: number;
}
