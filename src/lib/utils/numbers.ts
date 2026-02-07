/**
 * Number formatting utilities - ported from api/src/dataUtil/numbers.ts
 */

type Numberish = number | string;

/** Number toFixed(2) float parser util */
export const N = (arg: Numberish, fix = 2): number =>
  Number(parseFloat(arg as string).toFixed(fix));

export const HF = (arg: Numberish): number => N(arg, 4);

export const Percent = (n: Numberish, total: number, fix?: number): number =>
  N((100.0 * (n as number)) / total, fix);

export const PositiveOrMinus1 = (n: number): number => (n >= 0 ? n : -1);
