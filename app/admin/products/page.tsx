"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Category = { _id: string; name: string };

type Img = { url: string; publicId: string };

type Option = {
  _id?: string; // exists after saving
  name: string;
  image: Img | null; // Cloudinary object
  price: string; // keep as string in inputs
  salePrice: string; // keep as string in inputs ("" => null)
  inStock: string; // keep as string in inputs
  uploading?: boolean;
};

type Product = {
  _id: string;
  title: string;
  categoryId: string;
  description: string;
  top: boolean;
  defaultOptionId: string | null;
  options: {
    _id: string;
    name: string;
    image: Img;
    price: number;
    salePrice?: number | null;
    inStock: number;
  }[];
};

const emptyOption = (): Option => ({
  name: "",
  image: null,
  price: "0",
  salePrice: "",
  inStock: "0",
  uploading: false,
});

async function uploadToCloudinary(file: File): Promise<Img> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  if (!cloudName || !preset) throw new Error("Missing Cloudinary env variables");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  fd.append("folder", "lord/products");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Upload failed");

  return { url: String(json.secure_url), publicId: String(json.public_id) };
}

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState("");

  // one form for CREATE + EDIT
  const [form, setForm] = useState<{
    title: string;
    categoryId: string;
    description: string;
    top: boolean;
    defaultOptionIndex: number;
    options: Option[];
  }>({
    title: "",
    categoryId: "",
    description: "",
    top: false,
    defaultOptionIndex: 0,
    options: [emptyOption()],
  });

  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  async function load() {
    const [cats, prods] = await Promise.all([
      apiFetch<{ items: Category[] }>("/api/admin/categories"),
      apiFetch<{ items: Product[] }>("/api/admin/products"),
    ]);

    setCategories(cats.items);
    setItems(prods.items);

    // set default category once
    setForm((p) => {
      if (p.categoryId || !cats.items[0]) return p;
      return { ...p, categoryId: cats.items[0]._id };
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryNameById = useMemo(() => {
    const map = new Map(categories.map((c) => [c._id, c.name]));
    return (id: string) => map.get(id) || "—";
  }, [categories]);

  function getDefaultOption(p: Product) {
    const byId = p.defaultOptionId ? p.options.find((o) => o._id === p.defaultOptionId) : null;
    return byId || p.options[0] || null;
  }

  // -------- form helpers --------
  function setOption(idx: number, patch: Partial<Option>) {
    setForm((prev) => {
      const next = [...prev.options];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, options: next };
    });
  }

  function addOption() {
    setForm((p) => ({ ...p, options: [...p.options, emptyOption()] }));
  }

  function removeOption(idx: number) {
    setForm((p) => {
      const next = p.options.filter((_, i) => i !== idx);
      const safeNext = next.length ? next : [emptyOption()];
      const defaultIndex = Math.min(p.defaultOptionIndex, Math.max(0, safeNext.length - 1));
      return { ...p, options: safeNext, defaultOptionIndex: defaultIndex };
    });
  }

  function resetFormToCreate() {
    setEditingProductId(null);
    setForm((p) => ({
      title: "",
      categoryId: p.categoryId || categories[0]?._id || "",
      description: "",
      top: false,
      defaultOptionIndex: 0,
      options: [emptyOption()],
    }));
  }

  function defaultIndexFromProduct(p: Product) {
    if (!p.defaultOptionId) return 0;
    const idx = p.options.findIndex((o) => o._id === p.defaultOptionId);
    return idx >= 0 ? idx : 0;
  }

  function startEditRow(p: Product) {
    setEditingProductId(p._id);

    const defaultIdx = defaultIndexFromProduct(p);

    setForm({
      title: p.title,
      categoryId: p.categoryId,
      description: p.description || "",
      top: !!p.top,
      defaultOptionIndex: defaultIdx,
      options: p.options.map((o) => ({
        _id: o._id,
        name: o.name,
        image: o.image,
        price: String(o.price),
        salePrice: o.salePrice == null ? "" : String(o.salePrice),
        inStock: String(o.inStock),
        uploading: false,
      })),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeProduct(id: string) {
    setError("");
    await apiFetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await load();

    // if you deleted the product you are editing, reset the form
    if (editingProductId === id) resetFormToCreate();
  }

  // -------- upload handlers --------
  async function handleUpload(idx: number, file: File) {
    setError("");
    setOption(idx, { uploading: true });

    try {
      const uploaded = await uploadToCloudinary(file);
      setOption(idx, { image: uploaded, uploading: false });
    } catch (e: any) {
      setOption(idx, { uploading: false });
      setError(e?.message || "Upload failed");
    }
  }

  // -------- submit (create or update) --------
  async function submitForm() {
    setError("");

    if (!form.title.trim()) return setError("Missing product title");
    if (!form.categoryId) return setError("Missing category");

    for (const [i, o] of form.options.entries()) {
      if (!o.name.trim()) return setError(`Option ${i + 1}: missing name`);
      if (!o.image?.url || !o.image.publicId) return setError(`Option ${i + 1}: missing image (upload required)`);
      if (!Number.isFinite(Number(o.price))) return setError(`Option ${i + 1}: invalid price`);
      if (o.salePrice !== "" && !Number.isFinite(Number(o.salePrice))) return setError(`Option ${i + 1}: invalid sale price`);
      if (Number(o.inStock) < 0) return setError(`Option ${i + 1}: stock must be >= 0`);
    }

    const optionsPayload = form.options.map((o) => ({
      name: o.name,
      image: o.image!, // { url, publicId }
      price: Number(o.price),
      salePrice: o.salePrice === "" ? null : Number(o.salePrice),
      inStock: Number(o.inStock),
    }));

    // In EDIT mode, if the selected default option has an _id, send it.
    // If not (new option), send null and let the server normalize to first.
    const selected = form.options[form.defaultOptionIndex] as any;
    const computedDefaultOptionId = selected?._id ?? null;

    const payload = {
      title: form.title,
      categoryId: form.categoryId,
      description: form.description,
      top: form.top,
      defaultOptionId: editingProductId ? computedDefaultOptionId : null,
      options: optionsPayload,
    };

    if (!editingProductId) {
      // CREATE
      const res = await apiFetch<{ item: Product }>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // After create: set default option by index using returned option ids
      const created = res.item;
      const chosenId =
        created.options?.[form.defaultOptionIndex]?._id ||
        created.options?.[0]?._id ||
        null;

      if (chosenId) {
        await apiFetch(`/api/admin/products/${created._id}`, {
          method: "PATCH",
          body: JSON.stringify({ defaultOptionId: chosenId }),
        });
      }
    } else {
      // UPDATE
      await apiFetch(`/api/admin/products/${editingProductId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    await load();
    resetFormToCreate();
  }

  return (
    <div>
      <h1 className="lux-heading text-3xl font-bold text-amber-50">מוצרים</h1>

      {/* FORM (Create + Edit) */}
      <div className="mt-6 rounded-3xl border border-amber-200/15 bg-black/25 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-amber-50/85">
            {editingProductId ? (
              <>
                מצב עריכה <span className="text-amber-200">•</span>{" "}
                <span className="text-amber-100/70">{editingProductId}</span>
              </>
            ) : (
              "הוספת מוצר חדש"
            )}
          </p>

          {editingProductId ? (
            <button
              type="button"
              onClick={resetFormToCreate}
              className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-black/45"
            >
              ביטול עריכה
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input
            className="rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none"
            placeholder="שם מוצר"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />

          <select
            className="rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none"
            value={form.categoryId}
            onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="mt-3 min-h-27.5 w-full rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none"
          placeholder="תיאור מוצר"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />

        <label className="mt-3 flex items-center gap-3 text-sm text-amber-50/85">
          <input
            type="checkbox"
            checked={form.top}
            onChange={(e) => setForm((p) => ({ ...p, top: e.target.checked }))}
          />
          מוצר מוביל (Top)
        </label>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-amber-50/85">אופציות + ברירת מחדל</p>
          <button
            type="button"
            onClick={addOption}
            className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-black/45"
          >
            הוסף אופציה +
          </button>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-3">
          {form.options.map((o, idx) => (
            <div
              key={o._id ?? idx}
              className="grid gap-3 rounded-2xl border border-amber-200/15 bg-black/30 p-3 lg:grid-cols-[auto_1.2fr_1.35fr_0.8fr_0.8fr_0.8fr_auto]"
            >
              {/* Default radio */}
              <div className="flex items-center justify-center">
                <input
                  type="radio"
                  name="defaultOption"
                  checked={form.defaultOptionIndex === idx}
                  onChange={() => setForm((p) => ({ ...p, defaultOptionIndex: idx }))}
                  title="ברירת מחדל"
                />
              </div>

              <input
                className="rounded-xl border border-amber-200/20 bg-black/40 px-4 py-3 text-amber-50 outline-none"
                placeholder="Option name (לדוגמה: שחור)"
                value={o.name}
                onChange={(e) => setOption(idx, { name: e.target.value })}
              />

              {/* Upload + preview */}
              <div className="grid gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-xs text-amber-50/80"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleUpload(idx, file);
                  }}
                />
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 overflow-hidden rounded-lg border border-amber-200/10 bg-black/40">
                    {o.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.image.url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-amber-100/70">
                    {o.uploading ? "Uploading..." : o.image?.publicId ? "Uploaded" : "No image"}
                  </p>
                </div>
              </div>

              <input
                className="rounded-xl border border-amber-200/20 bg-black/40 px-4 py-3 text-amber-50 outline-none"
                placeholder="Price"
                inputMode="decimal"
                value={o.price}
                onChange={(e) => setOption(idx, { price: e.target.value })}
              />

              <input
                className="rounded-xl border border-amber-200/20 bg-black/40 px-4 py-3 text-amber-50 outline-none"
                placeholder="Sale"
                inputMode="decimal"
                value={o.salePrice}
                onChange={(e) => setOption(idx, { salePrice: e.target.value })}
              />

              <input
                className="rounded-xl border border-amber-200/20 bg-black/40 px-4 py-3 text-amber-50 outline-none"
                placeholder="Stock"
                inputMode="numeric"
                value={o.inStock}
                onChange={(e) => setOption(idx, { inStock: e.target.value })}
              />

              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-3 text-xs font-semibold text-amber-50 hover:bg-black/45"
              >
                מחק
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={submitForm}
            className="lux-button w-full rounded-xl px-5 py-3 text-sm font-semibold"
          >
            {editingProductId ? "שמור שינויים" : "שמור מוצר"}
          </button>

          {editingProductId ? (
            <button
              type="button"
              onClick={resetFormToCreate}
              className="w-full rounded-xl border border-amber-200/25 bg-black/35 px-5 py-3 text-sm font-semibold text-amber-50 hover:bg-black/45"
            >
              ביטול
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </div>

      {/* TABLE (one row per product) */}
      <div className="mt-6 overflow-x-auto rounded-3xl border border-amber-200/15 bg-black/20">
        <div
          className="grid min-w-262.5 gap-3 border-b border-amber-200/10 bg-black/25 px-4 py-3 text-[11px] font-semibold text-amber-100/80"
          style={{ gridTemplateColumns: "56px 2.2fr 1.2fr 1.4fr 1fr 1fr 0.8fr 190px" }}
        >
          <div>תמונה</div>
          <div>כותרת</div>
          <div>קטגוריה</div>
          <div>אופציית ברירת מחדל</div>
          <div>מחיר רגיל</div>
          <div>מחיר מבצע</div>
          <div>מלאי</div>
          <div className="text-end">פעולות</div>
        </div>

        {items.map((p) => {
          const def = getDefaultOption(p);
          const basePrice = def?.price ?? 0;
          const salePrice = def?.salePrice ?? null;

          const isEditingThis = editingProductId === p._id;

          return (
            <div
              key={p._id}
              className={`grid min-w-262.5 gap-3 border-b border-amber-200/10 px-4 py-2.5 text-sm text-amber-50/90 ${
                isEditingThis ? "bg-black/25" : "hover:bg-black/20"
              }`}
              style={{ gridTemplateColumns: "56px 2.2fr 1.2fr 1.4fr 1fr 1fr 0.8fr 190px" }}
            >
              <div className="flex items-center">
                <div className="h-10 w-10 overflow-hidden rounded-lg border border-amber-200/10 bg-black/40">
                  {def?.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={def.image.url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
              </div>

              <div className="flex min-w-0 flex-col justify-center ps-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{p.title}</p>
                  {p.top ? (
                    <span className="rounded-full border border-amber-200/25 bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                      מוביל
                    </span>
                  ) : null}
                  {isEditingThis ? (
                    <span className="rounded-full border border-amber-200/20 bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-amber-100/80">
                      בעריכה
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-amber-100/60">{p.options.length} אפשרויות</p>
              </div>

              <div className="flex items-center text-xs text-amber-100/80">
                {categoryNameById(p.categoryId)}
              </div>

              <div className="flex items-center text-xs text-amber-100/80">
                {def?.name || "—"}
              </div>

              <div className="flex items-center text-xs text-amber-100/80">
                ₪{basePrice}
              </div>

              <div className="flex items-center text-xs text-amber-100/80">
                {salePrice != null ? `₪${salePrice}` : "—"}
              </div>

              <div className="flex items-center text-xs text-amber-100/80">
                {def?.inStock ?? 0}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => startEditRow(p)}
                  className="rounded-lg border border-amber-200/20 bg-black/35 px-3.5 py-2 text-[11px] font-semibold text-amber-50 hover:bg-black/45"
                >
                  ערוך
                </button>

                <button
                  onClick={() => removeProduct(p._id)}
                  className="rounded-lg border border-rose-300/30 bg-rose-950/30 px-3.5 py-2 text-[11px] font-semibold text-rose-200 hover:bg-rose-950/45"
                >
                  מחק
                </button>
              </div>
            </div>
          );
        })}

        {!items.length ? (
          <div className="px-4 py-6 text-sm text-amber-100/70">אין מוצרים עדיין.</div>
        ) : null}
      </div>
    </div>
  );
}
