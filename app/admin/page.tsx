"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type RangeKey = "this_month" | "last_30_days" | "last_90_days" | "year_to_date" | "custom" | "all";

type Summary = {
  totalOrders: number;
  grossRevenue: number;
  paidRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  cashOrders: number;
  visaOrders: number;
  paidRate: number;
};

type PeriodStats = {
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
};

type Growth = {
  ordersPct: number;
  grossRevenuePct: number;
  paidRevenuePct: number;
};

type MonthlyRow = {
  key: string;
  label: string;
  year: number;
  month: number;
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  pendingOrders: number;
  failedOrders: number;
  paidRate: number;
};

type RangeInfo = {
  key: RangeKey;
  label: string;
  start: string | null;
  end: string | null;
  previousStart: string | null;
  previousEnd: string | null;
};

type TopCustomer = {
  phone: string;
  name: string;
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  lastOrderAt: string;
};

type ProductInsightRow = {
  productId: string;
  title: string;
  optionName: string;
  qty: number;
  revenue: number;
  orders: number;
};

type ProductInsights = {
  topByRevenue: ProductInsightRow[];
  topByQty: ProductInsightRow[];
  slowMoving: ProductInsightRow[];
  soldProducts: number;
  totalProducts: number;
  unsoldProducts: number;
  coveragePct: number;
};

type PendingCashOrder = {
  id: string;
  orderRef: string;
  amount: number;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
};

type DashboardData = {
  ok: boolean;
  range: RangeInfo;
  summary: Summary;
  currentPeriod: PeriodStats;
  previousPeriod: PeriodStats;
  growth: Growth;
  monthly: MonthlyRow[];
  topCustomers: TopCustomer[];
  productInsights: ProductInsights;
  pendingCashOrders: PendingCashOrder[];
};

const RANGE_OPTIONS: Array<{ value: RangeKey; label: string }> = [
  { value: "this_month", label: "החודש הנוכחי" },
  { value: "last_30_days", label: "30 ימים אחרונים" },
  { value: "last_90_days", label: "90 ימים אחרונים" },
  { value: "year_to_date", label: "מתחילת השנה" },
  { value: "custom", label: "טווח מותאם" },
  { value: "all", label: "כל התקופות" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("he-IL").format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatPct(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe > 0 ? "+" : ""}${safe.toFixed(1)}%`;
}

function growthClass(value: number) {
  if (value > 0) return "text-emerald-200";
  if (value < 0) return "text-rose-200";
  return "text-amber-100/70";
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function toLocalDateInput(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pendingDaysLabel(value: string) {
  const createdAt = new Date(value);
  if (!Number.isFinite(createdAt.getTime())) return "-";
  const diffMs = Date.now() - createdAt.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 0) return "היום";
  if (days === 1) return "יום 1";
  return `${days} ימים`;
}

export default function AdminDashboard() {
  const [range, setRange] = useState<RangeKey>("this_month");
  const [customStart, setCustomStart] = useState(() => toLocalDateInput(addDays(new Date(), -29)));
  const [customEnd, setCustomEnd] = useState(() => toLocalDateInput(new Date()));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("range", range);
    if (range === "custom") {
      if (customStart) params.set("start", customStart);
      if (customEnd) params.set("end", customEnd);
    }
    return params.toString();
  }, [range, customStart, customEnd]);

  const load = useCallback(async () => {
    if (range === "custom") {
      if (!customStart || !customEnd) {
        setError("יש לבחור תאריך התחלה ותאריך סיום.");
        setLoading(false);
        return;
      }
      if (customStart > customEnd) {
        setError("תאריך התחלה חייב להיות קטן או שווה לתאריך סיום.");
        setLoading(false);
        return;
      }
    }

    try {
      setError("");
      setLoading(true);
      const json = await apiFetch<DashboardData>(`/api/admin/reports/overview?${queryString}`);
      setData(json);
    } catch (apiError: unknown) {
      setError(apiError instanceof Error ? apiError.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [range, customStart, customEnd, queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxMonthlyOrders = useMemo(() => {
    if (!data?.monthly?.length) return 1;
    return Math.max(...data.monthly.map((row) => row.orders), 1);
  }, [data]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-amber-100/75">Dashboard</p>
          <h1 className="lux-heading mt-2 text-3xl font-bold text-amber-50">דוחות חודשיים וניתוח מתקדם</h1>
          <p className="mt-2 text-sm text-amber-100/75">סינון לפי תקופה, לקוחות מובילים ותובנות מוצרים.</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200/15 bg-black/25 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-44 text-xs text-amber-100/75">
            טווח דוח
            <select
              value={range}
              onChange={(event) => setRange(event.target.value as RangeKey)}
              className="mt-1 block w-full rounded-lg border border-amber-200/20 bg-black/40 px-3 py-2 text-sm text-amber-50 outline-none"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-zinc-900">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {range === "custom" ? (
            <>
              <label className="text-xs text-amber-100/75">
                מתאריך
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="mt-1 block rounded-lg border border-amber-200/20 bg-black/40 px-3 py-2 text-sm text-amber-50 outline-none"
                />
              </label>
              <label className="text-xs text-amber-100/75">
                עד תאריך
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="mt-1 block rounded-lg border border-amber-200/20 bg-black/40 px-3 py-2 text-sm text-amber-50 outline-none"
                />
              </label>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void load();
            }}
            className="rounded-xl border border-amber-200/25 bg-black/35 px-4 py-2 text-xs font-semibold text-amber-50 hover:bg-black/45"
          >
            רענון נתונים
          </button>
        </div>

        {data ? (
          <p className="mt-3 text-xs text-amber-100/75">
            תקופה פעילה: {data.range.label}
            {data.range.start && data.range.end ? ` (${data.range.start} עד ${data.range.end})` : ""}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {loading && !data ? <p className="mt-6 text-sm text-amber-100/70">טוען נתוני דשבורד...</p> : null}

      {data ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">סה״כ הזמנות</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatNumber(data.summary.totalOrders)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">מחזור כולל</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatCurrency(data.summary.grossRevenue)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">הכנסה ששולמה</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatCurrency(data.summary.paidRevenue)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">אחוז הזמנות ששולמו</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{data.summary.paidRate.toFixed(1)}%</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">ממתינות לטיפול</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatNumber(data.summary.pendingOrders)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">הזמנות שנכשלו</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatNumber(data.summary.failedOrders)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">תשלום מזומן</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatNumber(data.summary.cashOrders)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4">
              <p className="text-xs text-amber-100/70">תשלום ויזה</p>
              <p className="mt-1 text-2xl font-bold text-amber-50">{formatNumber(data.summary.visaOrders)}</p>
            </article>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4 lg:col-span-1">
              <p className="text-xs text-amber-100/70">תקופה נבחרת</p>
              <p className="mt-2 text-sm text-amber-100/75">הזמנות: {formatNumber(data.currentPeriod.orders)}</p>
              <p className="mt-1 text-sm text-amber-100/75">מחזור: {formatCurrency(data.currentPeriod.grossRevenue)}</p>
              <p className="mt-1 text-sm text-amber-100/75">שולם: {formatCurrency(data.currentPeriod.paidRevenue)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4 lg:col-span-1">
              <p className="text-xs text-amber-100/70">תקופה קודמת</p>
              <p className="mt-2 text-sm text-amber-100/75">הזמנות: {formatNumber(data.previousPeriod.orders)}</p>
              <p className="mt-1 text-sm text-amber-100/75">מחזור: {formatCurrency(data.previousPeriod.grossRevenue)}</p>
              <p className="mt-1 text-sm text-amber-100/75">שולם: {formatCurrency(data.previousPeriod.paidRevenue)}</p>
            </article>
            <article className="rounded-2xl border border-amber-200/15 bg-black/25 p-4 lg:col-span-1">
              <p className="text-xs text-amber-100/70">שינוי מול תקופה קודמת</p>
              <p className={`mt-2 text-sm ${growthClass(data.growth.ordersPct)}`}>הזמנות: {formatPct(data.growth.ordersPct)}</p>
              <p className={`mt-1 text-sm ${growthClass(data.growth.grossRevenuePct)}`}>
                מחזור: {formatPct(data.growth.grossRevenuePct)}
              </p>
              <p className={`mt-1 text-sm ${growthClass(data.growth.paidRevenuePct)}`}>
                שולם: {formatPct(data.growth.paidRevenuePct)}
              </p>
            </article>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200/15 bg-black/20">
            <div className="border-b border-amber-200/10 bg-black/25 px-4 py-3">
              <h2 className="text-sm font-semibold text-amber-50">דוח חודשי - 12 חודשים (חדש למעלה)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-220 w-full text-sm">
                <thead className="bg-black/20 text-[11px] text-amber-100/75">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold">חודש</th>
                    <th className="px-4 py-3 text-right font-semibold">הזמנות</th>
                    <th className="px-4 py-3 text-right font-semibold">מחזור</th>
                    <th className="px-4 py-3 text-right font-semibold">שולם</th>
                    <th className="px-4 py-3 text-right font-semibold">ממתינות</th>
                    <th className="px-4 py-3 text-right font-semibold">נכשלו</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.monthly].reverse().map((row) => (
                    <tr key={row.key} className="border-t border-amber-200/10 text-amber-50/90">
                      <td className="px-4 py-3 text-xs">{row.label}</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-40 items-center gap-3">
                          <span className="w-10 text-xs">{formatNumber(row.orders)}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/35">
                            <div
                              className="h-full rounded-full bg-amber-300/70"
                              style={{ width: `${Math.max(2, (row.orders / maxMonthlyOrders) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{formatCurrency(row.grossRevenue)}</td>
                      <td className="px-4 py-3 text-xs">{formatCurrency(row.paidRevenue)}</td>
                      <td className="px-4 py-3 text-xs">{formatNumber(row.pendingOrders)}</td>
                      <td className="px-4 py-3 text-xs">{formatNumber(row.failedOrders)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            <section className="xl:col-span-2">
              <div className="rounded-2xl border border-amber-200/15 bg-black/20">
                <div className="border-b border-amber-200/10 bg-black/25 px-4 py-3">
                  <h2 className="text-sm font-semibold text-amber-50">לקוחות מובילים</h2>
                </div>
                <div className="p-4">
                  {data.topCustomers.length ? (
                    <div className="space-y-2">
                      {data.topCustomers.map((customer, index) => (
                        <div
                          key={`${customer.phone}:${index}`}
                          className="rounded-xl border border-amber-200/10 bg-black/25 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-amber-50">{customer.name || "-"}</p>
                              <p className="truncate text-[11px] text-amber-100/70">{customer.phone}</p>
                            </div>
                            <p className="text-xs text-amber-100/80">{formatNumber(customer.orders)} הזמנות</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-amber-100/70">
                            <span>מחזור: {formatCurrency(customer.grossRevenue)}</span>
                            <span>שולם: {formatCurrency(customer.paidRevenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-100/70">אין נתוני לקוחות בטווח שנבחר.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="xl:col-span-3">
              <div className="rounded-2xl border border-amber-200/15 bg-black/20">
                <div className="border-b border-amber-200/10 bg-black/25 px-4 py-3">
                  <h2 className="text-sm font-semibold text-amber-50">תובנות מוצרים</h2>
                  <p className="mt-1 text-[11px] text-amber-100/70">
                    כיסוי קטלוג: {data.productInsights.soldProducts}/{data.productInsights.totalProducts} (
                    {data.productInsights.coveragePct.toFixed(1)}%) | ללא מכירות:{" "}
                    {formatNumber(data.productInsights.unsoldProducts)}
                  </p>
                </div>
                <div className="grid gap-4 p-4 md:grid-cols-3">
                  <div>
                    <h3 className="text-xs font-semibold text-amber-100/85">מובילים לפי הכנסה</h3>
                    <div className="mt-2 space-y-2">
                      {data.productInsights.topByRevenue.slice(0, 6).map((row, index) => (
                        <div key={`rev:${row.productId}:${index}`} className="rounded-lg border border-amber-200/10 px-2 py-1">
                          <p className="truncate text-xs text-amber-50">{row.title}</p>
                          <p className="truncate text-[11px] text-amber-100/70">
                            {row.optionName} | {formatCurrency(row.revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-amber-100/85">מובילים לפי כמות</h3>
                    <div className="mt-2 space-y-2">
                      {data.productInsights.topByQty.slice(0, 6).map((row, index) => (
                        <div key={`qty:${row.productId}:${index}`} className="rounded-lg border border-amber-200/10 px-2 py-1">
                          <p className="truncate text-xs text-amber-50">{row.title}</p>
                          <p className="truncate text-[11px] text-amber-100/70">
                            {row.optionName} | x{formatNumber(row.qty)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-amber-100/85">איטיים במכירה</h3>
                    <div className="mt-2 space-y-2">
                      {data.productInsights.slowMoving.slice(0, 6).map((row, index) => (
                        <div key={`slow:${row.productId}:${index}`} className="rounded-lg border border-amber-200/10 px-2 py-1">
                          <p className="truncate text-xs text-amber-50">{row.title}</p>
                          <p className="truncate text-[11px] text-amber-100/70">
                            {row.optionName} | x{formatNumber(row.qty)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-amber-200/15 bg-black/20">
              <div className="border-b border-amber-200/10 bg-black/25 px-4 py-3">
                <h2 className="text-sm font-semibold text-amber-50">הזמנות מזומן ממתינות בלבד</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-190 w-full text-sm">
                  <thead className="bg-black/20 text-[11px] text-amber-100/75">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold">הזמנה</th>
                      <th className="px-4 py-3 text-right font-semibold">תאריך</th>
                      <th className="px-4 py-3 text-right font-semibold">משך המתנה</th>
                      <th className="px-4 py-3 text-right font-semibold">לקוח</th>
                      <th className="px-4 py-3 text-right font-semibold">פריטים</th>
                      <th className="px-4 py-3 text-right font-semibold">סכום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pendingCashOrders.length ? (
                      data.pendingCashOrders.map((order) => (
                        <tr key={order.id} className="border-t border-amber-200/10 text-amber-50/90">
                          <td className="px-4 py-3 text-xs font-semibold">{order.orderRef}</td>
                          <td className="px-4 py-3 text-xs">{formatDate(order.createdAt)}</td>
                          <td className="px-4 py-3 text-xs">{pendingDaysLabel(order.createdAt)}</td>
                          <td className="px-4 py-3 text-xs">
                            <p>{order.customerName}</p>
                            <p className="text-amber-100/70">{order.customerPhone}</p>
                          </td>
                          <td className="px-4 py-3 text-xs">{formatNumber(order.itemsCount)}</td>
                          <td className="px-4 py-3 text-xs font-semibold">{formatCurrency(order.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-amber-100/70">
                          אין כרגע הזמנות מזומן ממתינות.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
