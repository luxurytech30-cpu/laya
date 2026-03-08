import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";

type RangeKey = "this_month" | "last_30_days" | "last_90_days" | "year_to_date" | "custom" | "all";

type ResolvedRange = {
  key: RangeKey;
  label: string;
  start: Date | null;
  end: Date | null;
};

type OverallAggRow = {
  totalOrders: number;
  grossRevenue: number;
  paidRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  cashOrders: number;
  visaOrders: number;
};

type PeriodAggRow = {
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
};

type MonthlyAggRow = {
  _id: { year: number; month: number };
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  pendingOrders: number;
  failedOrders: number;
};

type TopCustomerAggRow = {
  _id: string;
  customerName: string;
  orders: number;
  grossRevenue: number;
  paidRevenue: number;
  lastOrderAt: Date;
};

type ProductAggRow = {
  _id: {
    productId: Types.ObjectId;
    title: string;
    optionName: string;
  };
  qty: number;
  revenue: number;
  orders: number;
};

type PendingCashDoc = {
  _id: Types.ObjectId;
  orderRef: string;
  amount: number;
  createdAt: Date;
  customer?: {
    name?: string;
    phone?: string;
  };
  items?: Array<{ qty?: number }>;
};

const RANGE_SET: ReadonlySet<RangeKey> = new Set([
  "this_month",
  "last_30_days",
  "last_90_days",
  "year_to_date",
  "custom",
  "all",
]);

const ZERO_PERIOD: PeriodAggRow = {
  orders: 0,
  grossRevenue: 0,
  paidRevenue: 0,
  paidOrders: 0,
  pendingOrders: 0,
  failedOrders: 0,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getAuthStatus(message: string) {
  return message === "NO_TOKEN" || message === "NOT_ADMIN" ? 401 : 500;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function safeNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function ratioPercent(part: number, total: number) {
  if (total <= 0) return 0;
  return round2((part / total) * 100);
}

function growthPercent(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) return 0;
    return 100;
  }
  return round2(((current - previous) / previous) * 100);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function toLocalIsoDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInput(value: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const parsed = new Date(year, month - 1, day);
  const isValid =
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  return isValid ? parsed : null;
}

function isRangeKey(value: string | null): value is RangeKey {
  return !!value && RANGE_SET.has(value as RangeKey);
}

function buildCreatedAtMatch(start: Date | null, end: Date | null) {
  const createdAt: { $gte?: Date; $lt?: Date } = {};
  if (start) createdAt.$gte = start;
  if (end) createdAt.$lt = end;
  return Object.keys(createdAt).length ? createdAt : null;
}

function buildMatch(start: Date | null, end: Date | null, extra: Record<string, unknown> = {}) {
  const match: Record<string, unknown> = { ...extra };
  const createdAt = buildCreatedAtMatch(start, end);
  if (createdAt) {
    match.createdAt = createdAt;
  }
  return match;
}

function withMatch(match: Record<string, unknown>) {
  return Object.keys(match).length ? [{ $match: match }] : [];
}

function resolveRange(searchParams: URLSearchParams, now: Date): ResolvedRange {
  const nowDayStart = startOfDay(now);
  const defaultEnd = addDays(nowDayStart, 1);
  const rawRange = searchParams.get("range");
  const key: RangeKey = isRangeKey(rawRange) ? rawRange : "this_month";

  if (key === "all") {
    return { key, label: "כל התקופות", start: null, end: null };
  }

  if (key === "this_month") {
    return {
      key,
      label: "החודש הנוכחי",
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: defaultEnd,
    };
  }

  if (key === "last_30_days") {
    return {
      key,
      label: "30 ימים אחרונים",
      start: addDays(defaultEnd, -30),
      end: defaultEnd,
    };
  }

  if (key === "last_90_days") {
    return {
      key,
      label: "90 ימים אחרונים",
      start: addDays(defaultEnd, -90),
      end: defaultEnd,
    };
  }

  if (key === "year_to_date") {
    return {
      key,
      label: "מתחילת השנה",
      start: new Date(now.getFullYear(), 0, 1),
      end: defaultEnd,
    };
  }

  const rawStart = parseDateInput(searchParams.get("start"));
  const rawEnd = parseDateInput(searchParams.get("end"));
  if (rawStart && rawEnd && rawStart.getTime() <= rawEnd.getTime()) {
    return {
      key: "custom",
      label: "טווח מותאם",
      start: rawStart,
      end: addDays(rawEnd, 1),
    };
  }

  return {
    key: "this_month",
    label: "החודש הנוכחי",
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: defaultEnd,
  };
}

function getPreviousRange(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  const windowMs = end.getTime() - start.getTime();
  if (windowMs <= 0) return null;
  return {
    start: new Date(start.getTime() - windowMs),
    end: start,
  };
}

async function aggregatePeriod(start: Date | null, end: Date | null): Promise<PeriodAggRow> {
  const [row] = await Order.aggregate<PeriodAggRow>([
    ...withMatch(buildMatch(start, end)),
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        grossRevenue: { $sum: "$amount" },
        paidRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", 0] } },
        paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
        pendingOrders: {
          $sum: {
            $cond: [{ $in: ["$paymentStatus", ["pending_cash", "pending_visa"]] }, 1, 0],
          },
        },
        failedOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] } },
      },
    },
  ]);

  return {
    orders: safeNumber(row?.orders),
    grossRevenue: safeNumber(row?.grossRevenue),
    paidRevenue: safeNumber(row?.paidRevenue),
    paidOrders: safeNumber(row?.paidOrders),
    pendingOrders: safeNumber(row?.pendingOrders),
    failedOrders: safeNumber(row?.failedOrders),
  };
}

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    await dbConnect();

    const now = new Date();
    const { searchParams } = new URL(req.url);
    const range = resolveRange(searchParams, now);
    const previousRange = getPreviousRange(range.start, range.end);

    const anchorDate = range.end ? new Date(range.end.getTime() - 1) : now;
    const anchorMonthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const monthlyStart = new Date(anchorMonthStart.getFullYear(), anchorMonthStart.getMonth() - 11, 1);
    const monthlyEnd = new Date(anchorMonthStart.getFullYear(), anchorMonthStart.getMonth() + 1, 1);

    const [
      overallAgg,
      currentPeriod,
      previousPeriod,
      monthlyRaw,
      topCustomersRaw,
      productRows,
      totalProducts,
      soldProducts,
      pendingCashDocs,
    ] = await Promise.all([
      Order.aggregate<OverallAggRow>([
        ...withMatch(buildMatch(range.start, range.end)),
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            grossRevenue: { $sum: "$amount" },
            paidRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", 0] } },
            paidOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
            pendingOrders: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", ["pending_cash", "pending_visa"]] }, 1, 0],
              },
            },
            failedOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] } },
            cashOrders: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cash"] }, 1, 0] } },
            visaOrders: { $sum: { $cond: [{ $eq: ["$paymentMethod", "visa"] }, 1, 0] } },
          },
        },
      ]).then((rows) => rows[0]),
      aggregatePeriod(range.start, range.end),
      previousRange ? aggregatePeriod(previousRange.start, previousRange.end) : Promise.resolve(ZERO_PERIOD),
      Order.aggregate<MonthlyAggRow>([
        ...withMatch(buildMatch(monthlyStart, monthlyEnd)),
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            orders: { $sum: 1 },
            grossRevenue: { $sum: "$amount" },
            paidRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", 0] } },
            pendingOrders: {
              $sum: {
                $cond: [{ $in: ["$paymentStatus", ["pending_cash", "pending_visa"]] }, 1, 0],
              },
            },
            failedOrders: { $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] } },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate<TopCustomerAggRow>([
        ...withMatch(buildMatch(range.start, range.end)),
        {
          $project: {
            amount: 1,
            paymentStatus: 1,
            createdAt: 1,
            customerName: { $trim: { input: { $ifNull: ["$customer.name", ""] } } },
            customerPhone: { $trim: { input: { $ifNull: ["$customer.phone", ""] } } },
          },
        },
        { $match: { customerPhone: { $ne: "" } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$customerPhone",
            customerName: { $first: "$customerName" },
            orders: { $sum: 1 },
            grossRevenue: { $sum: "$amount" },
            paidRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", 0] } },
            lastOrderAt: { $max: "$createdAt" },
          },
        },
        { $sort: { grossRevenue: -1, orders: -1 } },
        { $limit: 8 },
      ]),
      Order.aggregate<ProductAggRow>([
        ...withMatch(buildMatch(range.start, range.end)),
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              productId: "$items.productId",
              title: "$items.title",
              optionName: "$items.optionName",
            },
            qty: { $sum: "$items.qty" },
            revenue: { $sum: "$items.lineTotal" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Product.countDocuments(),
      Order.aggregate<{ _id: Types.ObjectId }>([
        ...withMatch(buildMatch(range.start, range.end)),
        { $unwind: "$items" },
        { $group: { _id: "$items.productId" } },
      ]),
      Order.find({ paymentMethod: "cash", paymentStatus: "pending_cash" })
        .select({ orderRef: 1, amount: 1, createdAt: 1, customer: 1, items: 1 })
        .sort({ createdAt: 1 })
        .limit(20)
        .lean<PendingCashDoc[]>(),
    ]);

    const monthlyMap = new Map(
      monthlyRaw.map((row) => [`${row._id.year}-${String(row._id.month).padStart(2, "0")}`, row])
    );
    const monthLabelFormatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

    const monthly = Array.from({ length: 12 }, (_, idx) => {
      const date = new Date(monthlyStart.getFullYear(), monthlyStart.getMonth() + idx, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const row = monthlyMap.get(key);
      const orders = safeNumber(row?.orders);
      const grossRevenue = safeNumber(row?.grossRevenue);
      const paidRevenue = safeNumber(row?.paidRevenue);
      const pendingOrders = safeNumber(row?.pendingOrders);
      const failedOrders = safeNumber(row?.failedOrders);

      return {
        key,
        label: monthLabelFormatter.format(date),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        orders,
        grossRevenue,
        paidRevenue,
        pendingOrders,
        failedOrders,
        paidRate: ratioPercent(paidRevenue, grossRevenue),
      };
    });

    const topCustomers = topCustomersRaw.map((row) => ({
      phone: row._id,
      name: row.customerName || "-",
      orders: safeNumber(row.orders),
      grossRevenue: safeNumber(row.grossRevenue),
      paidRevenue: safeNumber(row.paidRevenue),
      lastOrderAt: row.lastOrderAt,
    }));

    const insightRows = productRows.map((row) => ({
      productId: row._id?.productId ? String(row._id.productId) : "",
      title: row._id?.title || "Unknown",
      optionName: row._id?.optionName || "-",
      qty: safeNumber(row.qty),
      revenue: safeNumber(row.revenue),
      orders: safeNumber(row.orders),
    }));

    const topByRevenue = [...insightRows]
      .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty || b.orders - a.orders)
      .slice(0, 8);
    const topByQty = [...insightRows]
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue || b.orders - a.orders)
      .slice(0, 8);
    const slowMoving = [...insightRows]
      .sort((a, b) => a.qty - b.qty || a.revenue - b.revenue || a.orders - b.orders)
      .slice(0, 8);

    const soldProductsCount = soldProducts.length;
    const unsoldProducts = Math.max(safeNumber(totalProducts) - soldProductsCount, 0);

    const pendingCashOrders = pendingCashDocs.map((order) => ({
      id: String(order._id),
      orderRef: order.orderRef || "",
      amount: safeNumber(order.amount),
      createdAt: order.createdAt,
      customerName: order.customer?.name?.trim() || "-",
      customerPhone: order.customer?.phone?.trim() || "-",
      itemsCount: Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + safeNumber(item.qty), 0)
        : 0,
    }));

    const overall = overallAgg || {
      totalOrders: 0,
      grossRevenue: 0,
      paidRevenue: 0,
      paidOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      cashOrders: 0,
      visaOrders: 0,
    };

    const growth = previousRange
      ? {
          ordersPct: growthPercent(currentPeriod.orders, previousPeriod.orders),
          grossRevenuePct: growthPercent(currentPeriod.grossRevenue, previousPeriod.grossRevenue),
          paidRevenuePct: growthPercent(currentPeriod.paidRevenue, previousPeriod.paidRevenue),
        }
      : {
          ordersPct: 0,
          grossRevenuePct: 0,
          paidRevenuePct: 0,
        };

    return NextResponse.json({
      ok: true,
      range: {
        key: range.key,
        label: range.label,
        start: range.start ? toLocalIsoDate(range.start) : null,
        end: range.end ? toLocalIsoDate(addDays(range.end, -1)) : null,
        previousStart: previousRange?.start ? toLocalIsoDate(previousRange.start) : null,
        previousEnd: previousRange?.end ? toLocalIsoDate(addDays(previousRange.end, -1)) : null,
      },
      summary: {
        totalOrders: safeNumber(overall.totalOrders),
        grossRevenue: safeNumber(overall.grossRevenue),
        paidRevenue: safeNumber(overall.paidRevenue),
        paidOrders: safeNumber(overall.paidOrders),
        pendingOrders: safeNumber(overall.pendingOrders),
        failedOrders: safeNumber(overall.failedOrders),
        cashOrders: safeNumber(overall.cashOrders),
        visaOrders: safeNumber(overall.visaOrders),
        paidRate: ratioPercent(safeNumber(overall.paidOrders), safeNumber(overall.totalOrders)),
      },
      currentPeriod,
      previousPeriod,
      growth,
      monthly,
      topCustomers,
      productInsights: {
        topByRevenue,
        topByQty,
        slowMoving,
        soldProducts: soldProductsCount,
        totalProducts: safeNumber(totalProducts),
        unsoldProducts,
        coveragePct: ratioPercent(soldProductsCount, safeNumber(totalProducts)),
      },
      pendingCashOrders,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Unauthorized");
    return NextResponse.json({ ok: false, error: message }, { status: getAuthStatus(message) });
  }
}
