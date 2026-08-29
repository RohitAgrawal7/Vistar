import { categoryImage, seedCategories, seedMenuItems } from "@/lib/menu";
import type {
  MenuCatalog,
  MenuCategoryInput,
  MenuCategoryRecord,
  MenuItem,
  MenuItemInput,
} from "@/lib/types";
import { ApiError, createId } from "@/server/http";
import { getSupabase, isSupabaseConfigured } from "@/server/supabase";

let memory: MenuCatalog | null = null;
let seedPromise: Promise<void> | null = null;

function cloneCatalog(catalog: MenuCatalog): MenuCatalog {
  return structuredClone(catalog);
}

function defaultCatalog(): MenuCatalog {
  return {
    categories: seedCategories(),
    items: seedMenuItems(),
  };
}

function ensureMemory() {
  if (!memory) memory = defaultCatalog();
  return memory;
}

function slugify(label: string) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base || createId("cat").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
}

function parseComboImages(value: unknown): [string, string, string] | undefined {
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  const images = value.map((item) => String(item ?? "").trim());
  if (images.some((src) => !src)) return undefined;
  return images as [string, string, string];
}

function categoryFromRow(row: Record<string, unknown>): MenuCategoryRecord {
  return {
    id: String(row.id),
    label: String(row.label),
    blurb: String(row.blurb ?? ""),
    imageSrc: String(row.image_src ?? categoryImage(String(row.id))),
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active !== false,
  };
}

function itemFromRow(row: Record<string, unknown>): MenuItem {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    price: Number(row.price),
    category: String(row.category_id),
    imageSrc: String(row.image_src ?? ""),
    comboImages: parseComboImages(row.combo_images),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : undefined,
    available: row.available !== false,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function categoryToRow(category: MenuCategoryRecord) {
  return {
    id: category.id,
    label: category.label,
    blurb: category.blurb,
    image_src: category.imageSrc,
    sort_order: category.sortOrder,
    active: category.active,
  };
}

function itemToRow(item: MenuItem) {
  return {
    id: item.id,
    category_id: item.category,
    name: item.name,
    description: item.description,
    price: item.price,
    image_src: item.imageSrc,
    combo_images: item.comboImages ?? null,
    tags: item.tags ?? [],
    available: item.available,
    sort_order: item.sortOrder ?? 0,
  };
}

async function loadFromDb(): Promise<MenuCatalog | null> {
  if (!isSupabaseConfigured()) return null;
  const db = getSupabase();
  const [categories, items] = await Promise.all([
    db.from("menu_categories").select("*").order("sort_order", { ascending: true }),
    db.from("menu_items").select("*").order("sort_order", { ascending: true }),
  ]);
  if (categories.error || items.error) {
    // Tables may not exist yet — fall back to memory until SQL is applied.
    return null;
  }
  const categoryRows = (categories.data ?? []) as Record<string, unknown>[];
  const itemRows = (items.data ?? []) as Record<string, unknown>[];
  if (!categoryRows.length && !itemRows.length) {
    const seeded = defaultCatalog();
    const { error: catErr } = await db.from("menu_categories").upsert(seeded.categories.map(categoryToRow));
    const { error: itemErr } = await db.from("menu_items").upsert(seeded.items.map(itemToRow));
    if (catErr || itemErr) return seeded;
    return seeded;
  }
  const loaded = {
    categories: categoryRows.map(categoryFromRow),
    items: itemRows.map(itemFromRow),
  };
  return reconcileSeedMenu(loaded);
}

/** Keep seeded menu items in sync with code defaults (names + prices). */
const SEED_SYNC_ITEM_IDS = new Set(
  seedMenuItems()
    .filter((item) => item.category !== "combo")
    .map((item) => item.id),
);
const REMOVED_MENU_ITEM_IDS = new Set(["shk-kitkat"]);

async function reconcileSeedMenu(catalog: MenuCatalog): Promise<MenuCatalog> {
  const seed = defaultCatalog();
  let changed = false;

  const categories = catalog.categories.map((category) => ({ ...category }));
  for (const seedCategory of seed.categories.filter((item) => item.id === "coffee" || item.id === "shake")) {
    const index = categories.findIndex((item) => item.id === seedCategory.id);
    if (index < 0) {
      categories.push(seedCategory);
      changed = true;
      continue;
    }
    const current = categories[index];
    const next = {
      ...current,
      label: seedCategory.label,
      blurb: seedCategory.blurb,
      active: true,
    };
    if (
      current.label !== next.label ||
      current.blurb !== next.blurb ||
      !current.active
    ) {
      categories[index] = next;
      changed = true;
    }
  }

  let items = catalog.items.map((item) => ({ ...item }));
  for (const seedItem of seed.items.filter((item) => SEED_SYNC_ITEM_IDS.has(item.id))) {
    const index = items.findIndex((item) => item.id === seedItem.id);
    if (index < 0) {
      items.push(seedItem);
      changed = true;
      continue;
    }
    const current = items[index];
    const next = {
      ...current,
      name: seedItem.name,
      description: seedItem.description,
      price: seedItem.price,
      category: seedItem.category,
      available: true,
    };
    if (
      current.name !== next.name ||
      current.description !== next.description ||
      current.price !== next.price ||
      current.category !== next.category ||
      !current.available
    ) {
      items[index] = next;
      changed = true;
    }
  }

  const filtered = items.filter((item) => !REMOVED_MENU_ITEM_IDS.has(item.id));
  if (filtered.length !== items.length) {
    items = filtered;
    changed = true;
  }

  if (!changed) return catalog;

  const nextCatalog = { categories, items };
  try {
    for (const id of REMOVED_MENU_ITEM_IDS) {
      if (catalog.items.some((item) => item.id === id)) {
        await deleteItemFromDb(id);
      }
    }
    await saveToDb(nextCatalog);
  } catch {
    return nextCatalog;
  }
  return nextCatalog;
}

async function saveToDb(catalog: MenuCatalog) {
  if (!isSupabaseConfigured()) return;
  const db = getSupabase();
  const { error: catErr } = await db.from("menu_categories").upsert(catalog.categories.map(categoryToRow));
  if (catErr) throw new ApiError(catErr.message || "Could not save categories", 500);
  const { error: itemErr } = await db.from("menu_items").upsert(catalog.items.map(itemToRow));
  if (itemErr) throw new ApiError(itemErr.message || "Could not save menu items", 500);
}

async function deleteCategoryFromDb(id: string) {
  if (!isSupabaseConfigured()) return;
  const db = getSupabase();
  await db.from("menu_items").delete().eq("category_id", id);
  const { error } = await db.from("menu_categories").delete().eq("id", id);
  if (error) throw new ApiError(error.message || "Could not remove category", 500);
}

async function deleteItemFromDb(id: string) {
  if (!isSupabaseConfigured()) return;
  const db = getSupabase();
  const { error } = await db.from("menu_items").delete().eq("id", id);
  if (error) throw new ApiError(error.message || "Could not remove item", 500);
}

async function refreshMemory() {
  const fromDb = await loadFromDb();
  memory = fromDb ?? ensureMemory();
}

async function withCatalog<T>(run: (catalog: MenuCatalog) => Promise<T> | T): Promise<T> {
  if (!seedPromise) {
    seedPromise = refreshMemory().finally(() => {
      seedPromise = null;
    });
  }
  await seedPromise;
  const catalog = ensureMemory();
  return run(catalog);
}

export async function getCatalog(includeHidden = false): Promise<MenuCatalog> {
  return withCatalog((catalog) => {
    if (includeHidden) return cloneCatalog(catalog);
    return {
      categories: catalog.categories.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder),
      items: catalog.items
        .filter((item) => {
          if (!item.available) return false;
          const category = catalog.categories.find((entry) => entry.id === item.category);
          return category?.active !== false;
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    };
  });
}

export async function getPublicMenu(): Promise<MenuItem[]> {
  const catalog = await getCatalog(false);
  return catalog.items;
}

export async function resolveMenuItem(id: string): Promise<MenuItem | undefined> {
  return withCatalog((catalog) => catalog.items.find((item) => item.id === id));
}

function assertPrice(price: number) {
  if (!Number.isFinite(price) || price < 0 || price > 100_000) {
    throw new ApiError("Enter a valid price", 400);
  }
}

export async function addCategory(input: MenuCategoryInput): Promise<MenuCategoryRecord> {
  const label = input.label?.trim();
  if (!label) throw new ApiError("Category name is required", 400);
  return withCatalog(async (catalog) => {
    let id = (input.id?.trim() || slugify(label)).toLowerCase();
    if (catalog.categories.some((item) => item.id === id)) {
      id = `${id}_${Date.now().toString(36)}`;
    }
    const category: MenuCategoryRecord = {
      id,
      label,
      blurb: input.blurb?.trim() ?? "",
      imageSrc: input.imageSrc?.trim() || categoryImage(id),
      sortOrder: input.sortOrder ?? catalog.categories.length,
      active: input.active !== false,
    };
    catalog.categories.push(category);
    await saveToDb(catalog);
    return { ...category };
  });
}

export async function updateCategory(
  id: string,
  input: Partial<MenuCategoryInput>,
): Promise<MenuCategoryRecord> {
  return withCatalog(async (catalog) => {
    const index = catalog.categories.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError("Category not found", 404);
    const current = catalog.categories[index];
    const next: MenuCategoryRecord = {
      ...current,
      label: input.label?.trim() || current.label,
      blurb: input.blurb !== undefined ? input.blurb.trim() : current.blurb,
      imageSrc: input.imageSrc?.trim() || current.imageSrc,
      sortOrder: input.sortOrder ?? current.sortOrder,
      active: input.active ?? current.active,
    };
    catalog.categories[index] = next;
    await saveToDb(catalog);
    return { ...next };
  });
}

export async function removeCategory(id: string): Promise<void> {
  return withCatalog(async (catalog) => {
    if (!catalog.categories.some((item) => item.id === id)) {
      throw new ApiError("Category not found", 404);
    }
    catalog.categories = catalog.categories.filter((item) => item.id !== id);
    catalog.items = catalog.items.filter((item) => item.category !== id);
    await deleteCategoryFromDb(id);
    memory = catalog;
  });
}

export async function addItem(input: MenuItemInput): Promise<MenuItem> {
  const name = input.name?.trim();
  if (!name) throw new ApiError("Item name is required", 400);
  assertPrice(Number(input.price));
  return withCatalog(async (catalog) => {
    if (!catalog.categories.some((item) => item.id === input.category)) {
      throw new ApiError("Unknown category", 400);
    }
    let id = (input.id?.trim() || createId("item")).toLowerCase();
    if (catalog.items.some((item) => item.id === id)) {
      id = `${id}_${Date.now().toString(36)}`;
    }
    const item: MenuItem = {
      id,
      name,
      description: input.description?.trim() ?? "",
      price: Number(input.price),
      category: input.category,
      imageSrc: input.imageSrc?.trim() || categoryImage(input.category),
      comboImages: input.comboImages === null ? undefined : input.comboImages ?? undefined,
      tags: input.tags,
      available: input.available !== false,
      sortOrder: input.sortOrder ?? catalog.items.length,
    };
    catalog.items.push(item);
    await saveToDb(catalog);
    return { ...item };
  });
}

export async function updateItem(id: string, input: Partial<MenuItemInput>): Promise<MenuItem> {
  return withCatalog(async (catalog) => {
    const index = catalog.items.findIndex((item) => item.id === id);
    if (index === -1) throw new ApiError("Item not found", 404);
    const current = catalog.items[index];
    if (input.category && !catalog.categories.some((item) => item.id === input.category)) {
      throw new ApiError("Unknown category", 400);
    }
    if (input.price !== undefined) assertPrice(Number(input.price));
    const next: MenuItem = {
      ...current,
      name: input.name?.trim() || current.name,
      description: input.description !== undefined ? input.description.trim() : current.description,
      price: input.price !== undefined ? Number(input.price) : current.price,
      category: input.category ?? current.category,
      imageSrc: input.imageSrc?.trim() || current.imageSrc,
      comboImages:
        input.comboImages === null
          ? undefined
          : input.comboImages !== undefined
            ? input.comboImages
            : current.comboImages,
      tags: input.tags ?? current.tags,
      available: input.available ?? current.available,
      sortOrder: input.sortOrder ?? current.sortOrder,
    };
    catalog.items[index] = next;
    await saveToDb(catalog);
    return { ...next };
  });
}

export async function removeItem(id: string): Promise<void> {
  return withCatalog(async (catalog) => {
    if (!catalog.items.some((item) => item.id === id)) {
      throw new ApiError("Item not found", 404);
    }
    catalog.items = catalog.items.filter((item) => item.id !== id);
    await deleteItemFromDb(id);
    memory = catalog;
  });
}
