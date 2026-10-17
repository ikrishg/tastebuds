export const RANGES = [
  { id: "7day", label: "7 days" },
  { id: "1month", label: "1 month" },
  { id: "6month", label: "6 months" },
  { id: "overall", label: "All time" },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

export const DEFAULT_RANGE: RangeId = "7day";

export const isRangeId = (value: unknown): value is RangeId =>
  RANGES.some((r) => r.id === value);

export const rangeLabel = (id: RangeId): string =>
  RANGES.find((r) => r.id === id)?.label ?? id;
