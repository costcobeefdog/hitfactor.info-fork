import coElo from "../../../data/elo/co.json";
import loElo from "../../../data/elo/lo.json";
import ltdElo from "../../../data/elo/ltd.json";
import opnElo from "../../../data/elo/open.json";
import pccElo from "../../../data/elo/pcc.json";
import prodElo from "../../../data/elo/prod.json";
import revElo from "../../../data/elo/rev.json";
import ssElo from "../../../data/elo/ss.json";

const divEloByMemberNumber = divElo =>
  divElo.reduce((acc, c, index, all) => {
    const { memberNumber, rating, name, knownMemberNumbers } = c;
    const dataPoint = {
      name,
      elo: rating,
      rating,
      eloRank: (100 * index) / all.length,
    };
    acc[memberNumber] = dataPoint;
    knownMemberNumbers?.forEach(known => (acc[known] = dataPoint));
    return acc;
  }, {});

const eloByDivisionByMemberNumber = {
  opn: divEloByMemberNumber(opnElo),
  co: divEloByMemberNumber(coElo),
  lo: divEloByMemberNumber(loElo),
  pcc: divEloByMemberNumber(pccElo),
  ltd: divEloByMemberNumber(ltdElo),
  l10: divEloByMemberNumber(ltdElo), // placeholder, no l10 ELO available
  prod: divEloByMemberNumber(prodElo),
  ss: divEloByMemberNumber(ssElo),
  rev: divEloByMemberNumber(revElo),
};

interface ELOPoint {
  memberNumber: string;
  name: string;
  rating: number;
}

export const eloPointForShooter = (
  division: string,
  memberNumber: string,
): ELOPoint | null => {
  if (!division || !memberNumber) {
    return null;
  }

  const jsonInfo = eloByDivisionByMemberNumber[division]?.[memberNumber];
  if (!jsonInfo) {
    return null;
  }

  return {
    ...jsonInfo,
    memberNumber,
    division,
  };
};
