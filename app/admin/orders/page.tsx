"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type OrderPaymentMethod = "cash" | "visa";
type OrderPaymentStatus = "pending_cash" | "pending_visa" | "paid" | "failed";

type OrderItem = {
  productId: string;
  optionId: string;
  title: string;
  optionName: string;
  imageUrl?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type Order = {
  _id: string;
  orderRef: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  amount: number;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  items: OrderItem[];
  createdAt: string;
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatAmount(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

function paymentMethodLabel(method: OrderPaymentMethod) {
  return method === "visa" ? "\u05d5\u05d9\u05d6\u05d4" : "\u05de\u05d6\u05d5\u05de\u05df";
}

function paymentStatusMeta(status: OrderPaymentStatus) {
  if (status === "paid") {
    return { label: "\u05e9\u05d5\u05dc\u05dd", className: "border-emerald-300/30 bg-emerald-950/30 text-emerald-200" };
  }
  if (status === "failed") {
    return { label: "\u05e0\u05db\u05e9\u05dc", className: "border-rose-300/30 bg-rose-950/30 text-rose-200" };
  }
  if (status === "pending_visa") {
    return {
      label: "\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d0\u05d9\u05e9\u05d5\u05e8 \u05d5\u05d9\u05d6\u05d4",
      className: "border-sky-300/30 bg-sky-950/30 text-sky-200",
    };
  }
  return {
    label: "\u05de\u05de\u05ea\u05d9\u05df \u05dc\u05d8\u05d9\u05e4\u05d5\u05dc",
    className: "border-amber-300/30 bg-amber-950/30 text-amber-200",
  };
}

function itemLineTotal(item: OrderItem) {
  const stored = Number(item.lineTotal);
  if (Number.isFinite(stored) && stored >= 0) return stored;
  return Math.max(0, Number(item.qty) * Number(item.unitPrice));
}

export default function AdminOrdersPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const res = await apiFetch<{ items: Order[] }>("/api/admin/orders");
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (error: unknown) {
      setError(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  async function markCashOrderPaid(orderId: string) {
    try {
      setError("");
      setUpdatingOrderId(orderId);
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: "paid" }),
      });

      setItems((prev) =>
        prev.map((item) =>
          item._id === orderId
            ? {
                ...item,
                paymentStatus: "paid",
              }
            : item
        )
      );
    } catch (error: unknown) {
      setError(toErrorMessage(error));
    } finally {
      setUpdatingOrderId("");
    }
  }

  function toggleExpanded(orderId: string) {
    setExpandedOrderId((prev) => (prev === orderId ? "" : orderId));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const totalOrders = items.length;
  const pendingOrders = useMemo(
    () => items.filter((item) => item.paymentStatus === "pending_cash" || item.paymentStatus === "pending_visa").length,
    [items]
  );
  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="lux-heading text-3xl font-bold text-amber-50">{"\u05d4\u05d6\u05de\u05e0\u05d5\u05ea"}</h1>
          <p className="mt-2 text-sm text-amber-100/75">
            {"\u05db\u05dc \u05d4\u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05de\u05d4\u05d0\u05ea\u05e8, \u05db\u05d5\u05dc\u05dc \u05d0\u05de\u05e6\u05e2\u05d9 \u05ea\u05e9\u05dc\u05d5\u05dd \u05d5\u05e1\u05d8\u05d8\u05d5\u05e1."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
          className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-black/45"
        >
          {"\u05e8\u05e2\u05e0\u05d5\u05df"}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
          <p className="text-xs text-amber-100/70">{"\u05e1\u05d4\"\u05db \u05d4\u05d6\u05de\u05e0\u05d5\u05ea"}</p>
          <p className="mt-1 text-2xl font-bold text-amber-50">{totalOrders}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
          <p className="text-xs text-amber-100/70">{"\u05de\u05de\u05ea\u05d9\u05e0\u05d5\u05ea \u05dc\u05d8\u05d9\u05e4\u05d5\u05dc"}</p>
          <p className="mt-1 text-2xl font-bold text-amber-50">{pendingOrders}</p>
        </article>
        <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
          <p className="text-xs text-amber-100/70">{"\u05e1\u05d4\"\u05db \u05e1\u05db\u05d5\u05dd \u05d4\u05d6\u05de\u05e0\u05d5\u05ea"}</p>
          <p className="mt-1 text-2xl font-bold text-amber-50">{formatAmount(totalAmount)}</p>
        </article>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-amber-100/70">{"\u05d8\u05d5\u05e2\u05df \u05d4\u05d6\u05de\u05e0\u05d5\u05ea..."}</p> : null}

      {!loading && !items.length ? (
        <div className="mt-6 rounded-2xl border border-amber-200/15 bg-black/25 px-4 py-6 text-sm text-amber-100/70">
          {"\u05e2\u05d3\u05d9\u05d9\u05df \u05d0\u05d9\u05df \u05d4\u05d6\u05de\u05e0\u05d5\u05ea \u05d1\u05de\u05e2\u05e8\u05db\u05ea."}
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200/15 bg-black/20">
          <div className="hidden grid-cols-[1.5fr_1.25fr_0.9fr_1.3fr_0.9fr_0.9fr] gap-3 border-b border-amber-200/10 bg-black/25 px-4 py-3 text-[11px] font-semibold text-amber-100/80 md:grid">
            <div>{"\u05de\u05e1\u05e4\u05e8 \u05d4\u05d6\u05de\u05e0\u05d4"}</div>
            <div>{"\u05ea\u05d0\u05e8\u05d9\u05da"}</div>
            <div>{"\u05ea\u05e9\u05dc\u05d5\u05dd"}</div>
            <div>{"\u05e1\u05d8\u05d8\u05d5\u05e1"}</div>
            <div>{"\u05e1\u05db\u05d5\u05dd"}</div>
            <div className="text-end">{"\u05e4\u05e8\u05d8\u05d9\u05dd"}</div>
          </div>

          {items.map((order) => {
            const status = paymentStatusMeta(order.paymentStatus);
            const expanded = expandedOrderId === order._id;
            const detailsId = `order-details-${order._id}`;

            return (
              <article key={order._id} className="border-b border-amber-200/10 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleExpanded(order._id)}
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                  className="w-full text-right hover:bg-black/20"
                >
                  <div className="grid gap-2 px-4 py-3 text-sm text-amber-50 md:grid-cols-[1.5fr_1.25fr_0.9fr_1.3fr_0.9fr_0.9fr] md:items-center md:gap-3">
                    <div className="font-semibold">{order.orderRef}</div>
                    <div className="text-xs text-amber-100/75 md:text-sm">{formatDate(order.createdAt)}</div>
                    <div>
                      <span className="rounded-full border border-amber-200/25 bg-black/35 px-3 py-1 text-[11px] font-semibold text-amber-100">
                        {paymentMethodLabel(order.paymentMethod)}
                      </span>
                    </div>
                    <div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                    </div>
                    <div className="font-semibold">{formatAmount(order.amount)}</div>
                    <div className="text-end text-xs text-amber-100/75">{expanded ? "\u25b2" : "\u25bc"}</div>
                  </div>
                </button>

                {expanded ? (
                  <div id={detailsId} className="border-t border-amber-200/10 bg-black/25 px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-amber-50">{"\u05e4\u05e8\u05d8\u05d9 \u05d4\u05d6\u05de\u05e0\u05d4"}</h3>

                      {order.paymentMethod === "cash" && order.paymentStatus === "pending_cash" ? (
                        <button
                          type="button"
                          onClick={() => {
                            void markCashOrderPaid(order._id);
                          }}
                          disabled={updatingOrderId === order._id}
                          className="rounded-lg border border-emerald-300/35 bg-emerald-950/25 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-950/35 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingOrderId === order._id ? "\u05de\u05e2\u05d3\u05db\u05df..." : "\u05e1\u05de\u05df \u05db\u05e9\u05d5\u05dc\u05dd"}
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-amber-200/10 bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-amber-100/65">{"\u05dc\u05e7\u05d5\u05d7"}</p>
                        <p className="mt-1 text-sm text-amber-50">{order.customer?.name?.trim() || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200/10 bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-amber-100/65">{"\u05d8\u05dc\u05e4\u05d5\u05df"}</p>
                        <p className="mt-1 text-sm text-amber-50">{order.customer?.phone?.trim() || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200/10 bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-amber-100/65">{"\u05d0\u05d9\u05de\u05d9\u05d9\u05dc"}</p>
                        <p className="mt-1 text-sm text-amber-50">{order.customer?.email?.trim() || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200/10 bg-black/25 px-3 py-2">
                        <p className="text-[11px] text-amber-100/65">{"\u05db\u05de\u05d5\u05ea \u05e4\u05e8\u05d9\u05d8\u05d9\u05dd"}</p>
                        <p className="mt-1 text-sm font-semibold text-amber-50">{order.items.length}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200/10 bg-black/25 p-3">
                      <p className="text-[11px] text-amber-100/65">{"\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u05d1\u05d4\u05d6\u05de\u05e0\u05d4"}</p>
                      <div className="mt-2 space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${order._id}:${item.productId}:${item.optionId}:${idx}`}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100/85"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.imageUrl || "/placeholder.png"}
                                alt={item.title}
                                className="h-10 w-10 shrink-0 rounded-lg border border-amber-200/10 object-cover"
                              />
                              <span className="truncate">
                                {item.title} - {item.optionName} x{item.qty}
                              </span>
                            </div>
                            <span className="font-semibold text-amber-50">{formatAmount(itemLineTotal(item))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
