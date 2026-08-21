const STORAGE_PREFIX = "vistar-paid-visit:";

export interface PaidVisit {
  tableId: string;
  sessionId: string;
  guestName: string;
  total: number;
}

function key(tableId: string) {
  return `${STORAGE_PREFIX}${tableId}`;
}

export function savePaidVisit(visit: PaidVisit) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key(visit.tableId), JSON.stringify(visit));
}

export function readPaidVisit(tableId: string): PaidVisit | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(key(tableId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PaidVisit;
    if (!parsed.sessionId || parsed.tableId !== tableId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPaidVisit(tableId: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(key(tableId));
}
