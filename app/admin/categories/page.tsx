"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Category = { _id: string; name: string };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function toErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Request failed";
  }

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ items: Category[] }>("/api/admin/categories");
      setItems(res.items);
    } catch (error: unknown) {
      setError(toErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function create() {
    try {
      setError("");
      await apiFetch("/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      await load();
    } catch (error: unknown) {
      setError(toErrorMessage(error));
    }
  }

  async function remove(id: string) {
    try {
      setError("");
      await apiFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (error: unknown) {
      setError(toErrorMessage(error));
    }
  }

  return (
    <div>
      <h1 className="lux-heading text-3xl font-bold text-amber-50">קטגוריות</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <input
          className="rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none"
          placeholder="שם קטגוריה (עברית)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={create} className="lux-button rounded-xl px-5 py-3 text-sm font-semibold">
          הוסף קטגוריה
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {items.map((c) => (
          <div
            key={c._id}
            className="flex items-center justify-between rounded-2xl border border-amber-200/15 bg-black/25 px-4 py-3"
          >
            <p className="text-sm text-amber-50">{c.name}</p>
            <button
              onClick={() => remove(c._id)}
              className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-2 text-xs text-amber-50 hover:bg-black/45"
            >
              מחק
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
