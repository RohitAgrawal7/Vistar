import { FLOOR_TABLES, isFloorTableId } from "@/lib/floor";

export function parseTableInput(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  const fromUrl = value.match(/table[/:\s-]?(\d+)/i);
  const digits = (fromUrl?.[1] ?? value.replace(/^t(?:able)?[-_\s]*/i, "")).match(
    /(\d{1,3})/,
  )?.[1];

  if (!digits) return null;
  const tableId = String(Number.parseInt(digits, 10));
  if (!isFloorTableId(tableId)) return null;
  return tableId;
}

export function isValidTableId(tableId: string) {
  return isFloorTableId(tableId);
}

export function resolveFloorTableId(raw: string) {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    /* keep raw if it is not encoded */
  }
  if (isFloorTableId(value)) return value;
  return parseTableInput(value);
}

export function floorTableList() {
  return FLOOR_TABLES;
}
