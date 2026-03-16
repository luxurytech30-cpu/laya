"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Img = { url: string; publicId: string };
type Category = { _id: string; name: string; image?: Img | null };
type FeedbackState = { kind: "success" | "error"; message: string } | null;

async function uploadCategoryImage(file: File): Promise<Img> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  if (!cloudName || !preset) throw new Error("חסרים משתני Cloudinary");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", preset);
  fd.append("folder", "lord/catagory");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "העלאת התמונה נכשלה");

  return {
    url: String(json.secure_url),
    publicId: String(json.public_id),
  };
}

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [image, setImage] = useState<Img | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState<Img | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  function showFeedback(kind: "success" | "error", message: string) {
    setFeedback({ kind, message });
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 2200);
  }

  function toErrorMessage(err: unknown) {
    return err instanceof Error ? err.message : "הבקשה נכשלה";
  }

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: Category[] }>("/api/admin/categories");
      setItems(res.items);
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startEdit(category: Category) {
    setEditingId(category._id);
    setEditName(category.name);
    setEditImage(category.image ?? null);
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditImage(null);
    setEditUploading(false);
    setSavingEdit(false);
  }

  async function onChooseImage(file: File) {
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadCategoryImage(file);
      setImage(uploaded);
      showFeedback("success", "תמונת הקטגוריה הועלתה בהצלחה");
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message);
      showFeedback("error", message);
    } finally {
      setUploading(false);
    }
  }

  async function onChooseEditImage(file: File) {
    setError("");
    setEditUploading(true);
    try {
      const uploaded = await uploadCategoryImage(file);
      setEditImage(uploaded);
      showFeedback("success", "תמונת הקטגוריה לעריכה הועלתה בהצלחה");
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message);
      showFeedback("error", message);
    } finally {
      setEditUploading(false);
    }
  }

  async function create() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      const message = "נא להזין שם קטגוריה";
      setError(message);
      showFeedback("error", message);
      return;
    }
    if (!image?.url || !image.publicId) {
      const message = "נא להעלות תמונת קטגוריה";
      setError(message);
      showFeedback("error", message);
      return;
    }

    try {
      setError("");
      await apiFetch("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: trimmedName, image }),
      });
      setName("");
      setImage(null);
      await load();
      showFeedback("success", "הקטגוריה נוספה בהצלחה");
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message);
      showFeedback("error", message);
    }
  }

  async function saveEdit() {
    const id = editingId.trim();
    if (!id) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      const message = "נא להזין שם קטגוריה";
      setError(message);
      showFeedback("error", message);
      return;
    }
    if (!editImage?.url || !editImage.publicId) {
      const message = "נא להעלות תמונת קטגוריה";
      setError(message);
      showFeedback("error", message);
      return;
    }

    try {
      setError("");
      setSavingEdit(true);
      await apiFetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: trimmedName,
          image: editImage,
        }),
      });
      await load();
      cancelEdit();
      showFeedback("success", "הקטגוריה עודכנה בהצלחה");
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      setError(message);
      showFeedback("error", message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(id: string) {
    try {
      setError("");
      await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      await load();
      if (editingId === id) {
        cancelEdit();
      }
      showFeedback("success", "הקטגוריה נמחקה בהצלחה");
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      showFeedback("error", message);
    }
  }

  return (
    <div>
      <h1 className="lux-heading text-3xl font-bold text-amber-50">קטגוריות</h1>

      <div className="mt-6 rounded-2xl border border-amber-200/15 bg-black/25 p-4">
        <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto]">
          <input
            className="rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none"
            placeholder="שם קטגוריה"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <label className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-3 text-sm text-amber-100/85">
            העלאת תמונה
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-amber-50/80"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void onChooseImage(file);
              }}
            />
          </label>

          <button
            onClick={create}
            disabled={uploading}
            className="lux-button rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {uploading ? "מעלה..." : "הוסף קטגוריה"}
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-amber-200/10 bg-black/25">
          <div className="relative h-32 w-full md:h-36">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image?.url || "/placeholder.png"}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-95 saturate-110 contrast-110"
              style={{ objectPosition: "center 35%" }}
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/78 via-black/40 to-black/24" />
            <p className="absolute inset-inline-start-3 bottom-2 z-20 text-xs font-semibold text-amber-50/90">
              תצוגה מקדימה לקטגוריה
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {items.map((category) => (
          <div
            key={category._id}
            className="relative overflow-hidden rounded-2xl border border-amber-200/15 bg-black/25"
          >
            <div className="relative h-32 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.image?.url || "/placeholder.png"}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-95 saturate-110 contrast-110"
                style={{ objectPosition: "center 35%" }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/76 via-black/42 to-black/24" />
              <div className="relative z-10 flex h-full items-center justify-between px-4 py-3">
                <p className="text-sm font-semibold text-amber-50">{category.name}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="rounded-xl border border-amber-200/25 bg-black/45 px-4 py-2 text-xs text-amber-50 hover:bg-black/60"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => remove(category._id)}
                    className="rounded-xl border border-amber-200/25 bg-black/45 px-4 py-2 text-xs text-amber-50 hover:bg-black/60"
                  >
                    מחק
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingId ? (
        <div className="mt-6 rounded-2xl border border-amber-200/15 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="lux-heading text-xl font-bold text-amber-50">עריכת קטגוריה</h2>
            <button
              onClick={cancelEdit}
              className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-2 text-xs text-amber-50 hover:bg-black/45"
            >
              ביטול
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_1fr_auto]">
            <input
              className="rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none"
              placeholder="שם קטגוריה"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />

            <label className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-3 text-sm text-amber-100/85">
              החלפת תמונה
              <input
                type="file"
                accept="image/*"
                className="mt-2 block w-full text-xs text-amber-50/80"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void onChooseEditImage(file);
                }}
              />
            </label>

            <button
              onClick={saveEdit}
              disabled={savingEdit || editUploading}
              className="lux-button rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingEdit ? "שומר..." : "שמור"}
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-amber-200/10 bg-black/25">
            <div className="relative h-32 w-full md:h-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editImage?.url || "/placeholder.png"}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-95 saturate-110 contrast-110"
                style={{ objectPosition: "center 35%" }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/78 via-black/40 to-black/24" />
              <p className="absolute inset-inline-start-3 bottom-2 z-20 text-xs font-semibold text-amber-50/90">
                תצוגה מקדימה לעריכה
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={[
            "fixed top-4 right-4 left-4 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl sm:left-auto sm:w-[26rem]",
            feedback.kind === "success"
              ? "border-emerald-300/35 bg-emerald-950/85 text-emerald-100"
              : "border-rose-300/35 bg-rose-950/85 text-rose-100",
          ].join(" ")}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
