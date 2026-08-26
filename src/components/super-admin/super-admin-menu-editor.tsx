"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, orderService } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MenuCatalog, MenuCategoryRecord, MenuItem } from "@/lib/types";
import { useSuperAdminStore } from "@/store/super-admin-store";

export function SuperAdminMenuEditor() {
  const staffName = useSuperAdminStore((state) => state.staffName);
  const logoutStore = useSuperAdminStore((state) => state.logout);
  const [catalog, setCatalog] = useState<MenuCatalog | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [draftItem, setDraftItem] = useState({
    name: "",
    price: "",
    description: "",
    imageSrc: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await orderService.getAdminMenu();
      setCatalog(next);
      setCategoryId((current) => current || next.categories[0]?.id || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = catalog?.categories ?? [];
  const items = useMemo(() => {
    if (!catalog || !categoryId) return [];
    return catalog.items
      .filter((item) => item.category === categoryId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [catalog, categoryId]);

  async function run(action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    try {
      await orderService.superAdminLogout();
    } catch {
      // still clear local session
    }
    logoutStore();
  }

  async function saveCategory(category: MenuCategoryRecord, patch: Partial<MenuCategoryRecord>) {
    await run(async () => {
      await orderService.updateCategory(category.id, patch);
    }, "Category saved");
  }

  async function saveItem(item: MenuItem, patch: Partial<MenuItem>) {
    await run(async () => {
      await orderService.updateItem(item.id, {
        name: patch.name,
        description: patch.description,
        price: patch.price,
        imageSrc: patch.imageSrc,
        available: patch.available,
        category: patch.category,
        comboImages: patch.comboImages,
      });
    }, "Item saved");
  }

  return (
    <div className="min-h-dvh bg-cream">
      <SiteHeader />
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 pb-safe sm:gap-8 sm:px-6 sm:py-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-espresso/50">Menu control</p>
            <h1 className="mt-1 font-display text-3xl italic text-espresso sm:text-4xl">
              Super admin
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-espresso/70">
              Signed in as {staffName}. Add or remove categories, and edit prices, images, names,
              and availability. Kitchen staff cannot change the menu.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onLogout()}
            icon={<LogOut className="size-4" aria-hidden />}
          >
            Sign out
          </Button>
        </div>

        {error ? <Alert message={error} /> : null}
        {message ? <Alert tone="info" message={message} /> : null}
        {loading || !catalog ? (
          <Spinner label="Loading menu…" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className="rounded-[24px] border border-espresso/10 bg-white p-4">
              <h2 className="font-display text-xl italic text-espresso">Categories</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {categories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setCategoryId(category.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition",
                          categoryId === category.id
                            ? "bg-espresso text-cream"
                            : "bg-paper text-espresso ring-1 ring-espresso/10",
                        )}
                      >
                        <span className="font-medium">{category.label}</span>
                        {!category.active ? (
                          <span className="text-[10px] uppercase opacity-70">Hidden</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <input
                  value={newCategoryLabel}
                  onChange={(event) => setNewCategoryLabel(event.target.value)}
                  placeholder="New category name"
                  className="h-10 flex-1 rounded-xl border border-espresso/15 bg-paper px-3 text-sm outline-none focus:border-terracotta"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !newCategoryLabel.trim()}
                  loading={busy}
                  icon={<Plus className="size-3.5" aria-hidden />}
                  onClick={() =>
                    void run(async () => {
                      const created = await orderService.addCategory({
                        label: newCategoryLabel.trim(),
                      });
                      setNewCategoryLabel("");
                      setCategoryId(created.id);
                    }, "Category added")
                  }
                >
                  Add
                </Button>
              </div>
              {categoryId ? (
                <CategoryEditor
                  category={categories.find((item) => item.id === categoryId)!}
                  busy={busy}
                  onSave={(patch) =>
                    void saveCategory(categories.find((item) => item.id === categoryId)!, patch)
                  }
                  onRemove={() =>
                    void run(async () => {
                      await orderService.removeCategory(categoryId);
                      setCategoryId("");
                    }, "Category removed")
                  }
                />
              ) : null}
            </section>

            <section className="rounded-[24px] border border-espresso/10 bg-white p-4 sm:p-5">
              <h2 className="font-display text-xl italic text-espresso">
                Items
                {categoryId
                  ? ` · ${categories.find((item) => item.id === categoryId)?.label ?? ""}`
                  : ""}
              </h2>
              {!categoryId ? (
                <p className="mt-3 text-sm text-espresso/60">Select a category.</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="New item name"
                      value={draftItem.name}
                      onChange={(value) => setDraftItem((prev) => ({ ...prev, name: value }))}
                    />
                    <Field
                      label="Price"
                      value={draftItem.price}
                      onChange={(value) =>
                        setDraftItem((prev) => ({
                          ...prev,
                          price: value.replace(/[^\d.]/g, ""),
                        }))
                      }
                      inputMode="decimal"
                    />
                    <Field
                      label="Description"
                      value={draftItem.description}
                      onChange={(value) =>
                        setDraftItem((prev) => ({ ...prev, description: value }))
                      }
                      className="sm:col-span-2"
                    />
                    <Field
                      label="Image path or URL"
                      value={draftItem.imageSrc}
                      onChange={(value) => setDraftItem((prev) => ({ ...prev, imageSrc: value }))}
                      className="sm:col-span-2"
                      placeholder="/menu/coffee.jpg"
                    />
                  </div>
                  <Button
                    type="button"
                    className="mt-3"
                    disabled={busy || !draftItem.name.trim() || !draftItem.price}
                    loading={busy}
                    icon={<Plus className="size-3.5" aria-hidden />}
                    onClick={() =>
                      void run(async () => {
                        await orderService.addItem({
                          name: draftItem.name.trim(),
                          price: Number(draftItem.price),
                          description: draftItem.description.trim(),
                          imageSrc: draftItem.imageSrc.trim() || undefined,
                          category: categoryId,
                        });
                        setDraftItem({ name: "", price: "", description: "", imageSrc: "" });
                      }, "Item added")
                    }
                  >
                    Add item
                  </Button>

                  <ul className="mt-6 flex flex-col gap-4">
                    {items.map((item) => (
                      <ItemEditor
                        key={item.id}
                        item={item}
                        busy={busy}
                        onSave={(patch) => void saveItem(item, patch)}
                        onRemove={() =>
                          void run(async () => {
                            await orderService.removeItem(item.id);
                          }, "Item removed")
                        }
                      />
                    ))}
                    {items.length === 0 ? (
                      <li className="text-sm text-espresso/55">No items in this category yet.</li>
                    ) : null}
                  </ul>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  inputMode?: "decimal" | "text" | "numeric";
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-espresso/70">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-10 w-full rounded-xl border border-espresso/15 bg-paper px-3 text-sm outline-none focus:border-terracotta"
      />
    </label>
  );
}

function CategoryEditor({
  category,
  busy,
  onSave,
  onRemove,
}: {
  category: MenuCategoryRecord;
  busy: boolean;
  onSave: (patch: Partial<MenuCategoryRecord>) => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(category.label);
  const [blurb, setBlurb] = useState(category.blurb);
  const [imageSrc, setImageSrc] = useState(category.imageSrc);
  const [active, setActive] = useState(category.active);

  useEffect(() => {
    setLabel(category.label);
    setBlurb(category.blurb);
    setImageSrc(category.imageSrc);
    setActive(category.active);
  }, [category]);

  return (
    <div className="mt-5 space-y-3 border-t border-espresso/10 pt-4">
      <Field label="Label" value={label} onChange={setLabel} />
      <Field label="Blurb" value={blurb} onChange={setBlurb} />
      <Field label="Image" value={imageSrc} onChange={setImageSrc} placeholder="/menu/…" />
      <label className="flex items-center gap-2 text-sm text-espresso/80">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Visible on guest menu
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          loading={busy}
          onClick={() => onSave({ label, blurb, imageSrc, active })}
        >
          Save category
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          icon={<Trash2 className="size-3.5" aria-hidden />}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  busy,
  onSave,
  onRemove,
}: {
  item: MenuItem;
  busy: boolean;
  onSave: (patch: Partial<MenuItem>) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [description, setDescription] = useState(item.description);
  const [imageSrc, setImageSrc] = useState(item.imageSrc);
  const [available, setAvailable] = useState(item.available);

  useEffect(() => {
    setName(item.name);
    setPrice(String(item.price));
    setDescription(item.description);
    setImageSrc(item.imageSrc);
    setAvailable(item.available);
  }, [item]);

  return (
    <li className="rounded-2xl border border-espresso/10 bg-paper/60 p-3 sm:p-4">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc || item.imageSrc}
          alt=""
          className="size-16 shrink-0 rounded-xl object-cover sm:size-20"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Field label="Name" value={name} onChange={setName} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label={`Price (now ${formatCurrency(item.price)})`}
              value={price}
              onChange={(value) => setPrice(value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
            />
            <Field label="Image path / URL" value={imageSrc} onChange={setImageSrc} />
          </div>
          <Field label="Description" value={description} onChange={setDescription} />
          <label className="flex items-center gap-2 text-sm text-espresso/80">
            <input
              type="checkbox"
              checked={available}
              onChange={(event) => setAvailable(event.target.checked)}
            />
            Available to order
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              loading={busy}
              onClick={() =>
                onSave({
                  name,
                  description,
                  price: Number(price),
                  imageSrc,
                  available,
                })
              }
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              icon={<Trash2 className="size-3.5" aria-hidden />}
              onClick={onRemove}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}
