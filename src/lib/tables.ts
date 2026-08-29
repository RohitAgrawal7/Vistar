import {
  DEFAULT_FLOOR_TABLES,
  isFloorTableId,
  normalizeTableId,
} from "@/lib/floor";

/** Strip query, hash, trailing slash, and invisible characters from QR / URL payloads. */
function cleanTableToken(raw: string) {
  let value = raw.trim();
  try {
    value = decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    /* keep raw if it is not encoded */
  }
  value = value.split(/[?#]/)[0]?.replace(/\/+$/, "").trim() ?? "";
  value = value.replace(/[\u200B-\u200D\uFEFF]/g, "");
  return value;
}

export function parseTableInput(raw: string) {
  const value = cleanTableToken(raw);
  if (!value) return null;

  const fromUrl = value.match(/table[/:\s-]?(\d{1,3})/i);
  const digits = (fromUrl?.[1] ?? value.replace(/^t(?:able)?[-_\s]*/i, "")).match(
    /(\d{1,3})/,
  )?.[1];

  if (!digits) return null;
  return normalizeTableId(digits);
}

export function isValidTableId(tableId: string) {
  return isFloorTableId(tableId);
}

export function resolveFloorTableId(raw: string) {
  const value = cleanTableToken(raw);
  if (isFloorTableId(value)) return normalizeTableId(value);
  return parseTableInput(value);
}

export function floorTableList() {
  return DEFAULT_FLOOR_TABLES.map((table) => table.id);
}
