export const FLOOR_TABLES = ["1", "2", "3", "4", "5"] as const;

export type FloorTableId = (typeof FLOOR_TABLES)[number];

export const FLOOR_META: Record<
  FloorTableId,
  { label: string; zone: string }
> = {
  "1": { label: "Table 1", zone: "Window" },
  "2": { label: "Table 2", zone: "Indoor" },
  "3": { label: "Table 3", zone: "Indoor" },
  "4": { label: "Table 4", zone: "Garden" },
  "5": { label: "Table 5", zone: "Garden" },
};

export function isFloorTableId(value: string): value is FloorTableId {
  return (FLOOR_TABLES as readonly string[]).includes(value);
}

export function tableMenuPath(tableId: string) {
  return `/table/${tableId}`;
}

export function buildTableScanUrl(tableId: string, origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}${tableMenuPath(tableId)}`;
}
