import {
  DEFAULT_FLOOR_TABLES,
  normalizeTableId,
  sortFloorTables,
} from "@/lib/floor";
import type { FloorTable } from "@/lib/types";
import { ApiError } from "@/server/http";
import { getSupabase, isSupabaseConfigured } from "@/server/supabase";

let memory: FloorTable[] | null = null;
let seedPromise: Promise<void> | null = null;

function cloneTables(tables: FloorTable[]) {
  return structuredClone(tables);
}

function defaultTables() {
  return cloneTables(DEFAULT_FLOOR_TABLES);
}

function ensureMemory() {
  if (!memory) memory = defaultTables();
  return memory;
}

function fromRow(row: Record<string, unknown>): FloorTable {
  return {
    id: String(row.id),
    label: String(row.label ?? `Table ${row.id}`),
    zone: String(row.zone ?? "Floor"),
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active !== false,
  };
}

function toRow(table: FloorTable) {
  return {
    id: table.id,
    label: table.label,
    zone: table.zone,
    sort_order: table.sortOrder,
    active: table.active,
  };
}

async function loadFromDb(): Promise<FloorTable[] | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabase();
  const { data, error } = await db
    .from("floor_tables")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    // Table may not exist yet — fall back to seed until SQL is applied.
    if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
      return null;
    }
    throw new ApiError(error.message || "Could not load floor tables", 500);
  }
  if (!data?.length) return [];
  return sortFloorTables(data.map((row) => fromRow(row as Record<string, unknown>)));
}

async function saveAll(tables: FloorTable[]) {
  if (!isSupabaseConfigured()) {
    memory = cloneTables(tables);
    return;
  }
  const db = getSupabase();
  const { error } = await db.from("floor_tables").upsert(tables.map(toRow));
  if (error) {
    if (/relation .* does not exist|Could not find the table/i.test(error.message)) {
      memory = cloneTables(tables);
      return;
    }
    throw new ApiError(error.message || "Could not save floor tables", 500);
  }
  memory = cloneTables(tables);
}

async function seedIfEmpty() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const loaded = await loadFromDb();
    if (loaded === null) {
      // No Supabase table / not configured — use in-memory defaults.
      ensureMemory();
      return;
    }
    if (loaded.length === 0) {
      await saveAll(defaultTables());
      return;
    }
    // Ensure new default tables (e.g. 6 & 7) exist without wiping custom ones.
    const have = new Set(loaded.map((table) => table.id));
    const missing = DEFAULT_FLOOR_TABLES.filter((table) => !have.has(table.id));
    if (missing.length) {
      const merged = sortFloorTables([...loaded, ...missing]);
      await saveAll(merged);
      return;
    }
    memory = loaded;
  })().finally(() => {
    seedPromise = null;
  });
  return seedPromise;
}

export async function listFloorTables(activeOnly = true): Promise<FloorTable[]> {
  await seedIfEmpty();
  const loaded = await loadFromDb();
  const tables = loaded && loaded.length ? loaded : ensureMemory();
  memory = cloneTables(tables);
  const sorted = sortFloorTables(tables);
  return activeOnly ? sorted.filter((table) => table.active) : sorted;
}

export async function isKnownFloorTable(tableId: string): Promise<boolean> {
  const id = normalizeTableId(tableId);
  if (!id) return false;
  const tables = await listFloorTables(true);
  return tables.some((table) => table.id === id);
}

export async function addFloorTable(input: {
  id: string;
  label?: string;
  zone?: string;
}): Promise<FloorTable> {
  const id = normalizeTableId(input.id);
  if (!id) {
    throw new ApiError("Enter a table number from 1 to 99", 400);
  }
  const tables = await listFloorTables(false);
  if (tables.some((table) => table.id === id)) {
    throw new ApiError(`Table ${id} already exists`, 409);
  }
  const next: FloorTable = {
    id,
    label: (input.label ?? `Table ${id}`).trim() || `Table ${id}`,
    zone: (input.zone ?? "Floor").trim() || "Floor",
    sortOrder: Number(id),
    active: true,
  };
  const merged = sortFloorTables([...tables, next]);
  await saveAll(merged);
  return next;
}

export async function updateFloorTable(
  idRaw: string,
  patch: Partial<Pick<FloorTable, "label" | "zone" | "active" | "sortOrder">>,
): Promise<FloorTable> {
  const id = normalizeTableId(idRaw);
  if (!id) throw new ApiError("Unknown table", 404);
  const tables = await listFloorTables(false);
  const index = tables.findIndex((table) => table.id === id);
  if (index < 0) throw new ApiError("Unknown table", 404);
  const current = tables[index];
  const next: FloorTable = {
    ...current,
    label: patch.label !== undefined ? patch.label.trim() || current.label : current.label,
    zone: patch.zone !== undefined ? patch.zone.trim() || current.zone : current.zone,
    active: patch.active ?? current.active,
    sortOrder: patch.sortOrder ?? current.sortOrder,
  };
  tables[index] = next;
  await saveAll(sortFloorTables(tables));
  return next;
}

export async function removeFloorTable(idRaw: string): Promise<void> {
  const id = normalizeTableId(idRaw);
  if (!id) throw new ApiError("Unknown table", 404);
  const tables = await listFloorTables(false);
  if (!tables.some((table) => table.id === id)) {
    throw new ApiError("Unknown table", 404);
  }
  if (tables.filter((table) => table.active).length <= 1 && tables.find((t) => t.id === id)?.active) {
    throw new ApiError("Keep at least one active table on the floor", 400);
  }
  await saveAll(tables.filter((table) => table.id !== id));
  if (isSupabaseConfigured()) {
    const db = getSupabase();
    const { error } = await db.from("floor_tables").delete().eq("id", id);
    if (error && !/relation .* does not exist/i.test(error.message)) {
      throw new ApiError(error.message || "Could not remove table", 500);
    }
  }
}
