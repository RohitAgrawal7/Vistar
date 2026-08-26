export type FloorTableId = string;

export type FloorTable = {
  id: FloorTableId;
  label: string;
  zone: string;
  sortOrder: number;
  active: boolean;
};

/** Seed tables when the café has none configured yet. */
export const DEFAULT_FLOOR_TABLES: FloorTable[] = [
  { id: "1", label: "Table 1", zone: "Window", sortOrder: 1, active: true },
  { id: "2", label: "Table 2", zone: "Indoor", sortOrder: 2, active: true },
  { id: "3", label: "Table 3", zone: "Indoor", sortOrder: 3, active: true },
  { id: "4", label: "Table 4", zone: "Garden", sortOrder: 4, active: true },
  { id: "5", label: "Table 5", zone: "Garden", sortOrder: 5, active: true },
  { id: "6", label: "Table 6", zone: "Patio", sortOrder: 6, active: true },
  { id: "7", label: "Table 7", zone: "Patio", sortOrder: 7, active: true },
];

/** @deprecated Prefer DEFAULT_FLOOR_TABLES — kept for older imports. */
export const FLOOR_TABLES = DEFAULT_FLOOR_TABLES.map((table) => table.id);

/** @deprecated Prefer floorTableMeta() / FloorTable.label */
export const FLOOR_META: Record<string, { label: string; zone: string }> =
  Object.fromEntries(
    DEFAULT_FLOOR_TABLES.map((table) => [table.id, { label: table.label, zone: table.zone }]),
  );

export const TABLE_ID_MIN = 1;
export const TABLE_ID_MAX = 99;

export function normalizeTableId(raw: string) {
  const digits = raw.trim().match(/^(\d{1,3})$/)?.[1];
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < TABLE_ID_MIN || n > TABLE_ID_MAX) return null;
  return String(n);
}

export function isFloorTableId(value: string): boolean {
  return normalizeTableId(value) !== null;
}

export function floorTableMeta(
  tableId: string,
  tables?: FloorTable[],
): { label: string; zone: string } {
  const known = tables?.find((table) => table.id === tableId);
  if (known) return { label: known.label, zone: known.zone };
  const fallback = FLOOR_META[tableId];
  if (fallback) return fallback;
  return { label: `Table ${tableId}`, zone: "Floor" };
}

export function tableMenuPath(tableId: string) {
  return `/table/${tableId}`;
}

export function buildTableScanUrl(tableId: string, origin: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}${tableMenuPath(tableId)}`;
}

export function sortFloorTables(tables: FloorTable[]) {
  return [...tables].sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id) - Number(b.id));
}
