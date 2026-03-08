import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { Product } from "@/models/Product";
import { Order, type OrderPaymentStatus } from "@/models/Order";

type PaymentMethod = "cash" | "visa";

type CheckoutBody = {
  paymentMethod?: unknown;
  customer?: {
    name?: unknown;
    phone?: unknown;
    email?: unknown;
  };
};

type CartStoredItem = {
  productId: string;
  optionId: string;
  qty: number;
};

type ProductOptionLite = {
  _id: Types.ObjectId;
  name: string;
  image?: {
    url?: string;
  };
  price: number;
  salePrice?: number | null;
  inStock: number;
};

type ProductLite = {
  _id: Types.ObjectId;
  title: string;
  options: ProductOptionLite[];
};

type CheckoutItem = {
  productId: string;
  optionId: string;
  title: string;
  optionName: string;
  imageUrl: string;
  qty: number;
  unitPrice: number;
};

type CheckoutOrderItem = {
  productId: Types.ObjectId;
  optionId: Types.ObjectId;
  title: string;
  optionName: string;
  imageUrl: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

const GREEN_API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
const GREEN_ID_INSTANCE = process.env.GREEN_ID_INSTANCE;
const GREEN_API_TOKEN_INSTANCE = process.env.GREEN_API_TOKEN_INSTANCE;
const GREEN_ADMIN_CHAT_ID = process.env.GREEN_ADMIN_CHAT_ID;

function getGuestId(req: Request) {
  const guestId = req.headers.get("x-guest-id")?.trim() ?? "";
  if (!guestId || guestId.length > 200) return "";
  return guestId;
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePaymentMethod(value: unknown): PaymentMethod | null {
  return value === "cash" || value === "visa" ? value : null;
}

function hasMinPhoneDigits(phone: string) {
  const digits = phone.match(/\d/g) ?? [];
  return digits.length >= 7;
}

function toObjectIdString(raw: unknown) {
  if (typeof raw === "string" && Types.ObjectId.isValid(raw)) {
    return raw;
  }

  if (raw instanceof Types.ObjectId) {
    return raw.toString();
  }

  if (typeof raw === "object" && raw !== null && "toString" in raw) {
    const value = String(raw.toString());
    if (Types.ObjectId.isValid(value)) return value;
  }

  return "";
}

function clampQty(raw: unknown) {
  const qty = Number(raw);
  if (!Number.isFinite(qty)) return 1;
  return Math.min(99, Math.max(1, Math.floor(qty)));
}

function parseCartItems(raw: unknown): CartStoredItem[] {
  if (!Array.isArray(raw)) return [];

  const out: CartStoredItem[] = [];
  for (const entry of raw) {
    const candidate = (entry ?? {}) as {
      productId?: unknown;
      optionId?: unknown;
      qty?: unknown;
    };

    const productId = toObjectIdString(candidate.productId);
    const optionId = toObjectIdString(candidate.optionId);
    if (!productId || !optionId) continue;

    out.push({
      productId,
      optionId,
      qty: clampQty(candidate.qty),
    });
  }

  return out;
}

function optionFinalPrice(option: ProductOptionLite) {
  const sale = typeof option.salePrice === "number" ? option.salePrice : null;
  return sale !== null && sale >= 0 ? sale : Number(option.price) || 0;
}

async function hydrateCheckoutItems(guestId: string) {
  const cart = await Cart.findOne({ guestId }).select({ items: 1 }).lean<{ items?: unknown } | null>();
  if (!cart) return [] as CheckoutItem[];

  const stored = parseCartItems(cart.items);
  if (stored.length === 0) return [] as CheckoutItem[];

  const productIds = Array.from(new Set(stored.map((item) => item.productId)));
  const products = await Product.find({ _id: { $in: productIds } })
    .select({ title: 1, options: 1 })
    .lean<ProductLite[]>();

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const result: CheckoutItem[] = [];

  for (const item of stored) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const option = product.options.find((opt) => opt._id.toString() === item.optionId);
    if (!option) continue;

    const stock = Number.isFinite(Number(option.inStock)) ? Math.max(0, Math.floor(Number(option.inStock))) : 0;
    const qty = stock > 0 ? Math.min(item.qty, stock) : item.qty;

    result.push({
      productId: product._id.toString(),
      optionId: option._id.toString(),
      title: product.title,
      optionName: option.name,
      imageUrl: option.image?.url || "/placeholder.png",
      qty,
      unitPrice: optionFinalPrice(option),
    });
  }

  return result;
}

function calcTotal(items: CheckoutItem[]) {
  return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

function createOrderRef() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${Date.now()}-${rand}`;
}

function paymentStatusFromMethod(method: PaymentMethod): OrderPaymentStatus {
  return method === "cash" ? "pending_cash" : "pending_visa";
}

function toOrderItems(items: CheckoutItem[]): CheckoutOrderItem[] {
  return items.map((item) => ({
    productId: new Types.ObjectId(item.productId),
    optionId: new Types.ObjectId(item.optionId),
    title: item.title,
    optionName: item.optionName,
    imageUrl: item.imageUrl,
    qty: item.qty,
    unitPrice: item.unitPrice,
    lineTotal: item.qty * item.unitPrice,
  }));
}

function paymentMethodLabel(method: PaymentMethod) {
  return method === "visa"
    ? "ויזה (Tranzila)"
    : "מזומן";
}

function formatIls(value: number) {
  return `₪${value.toFixed(2)}`;
}

async function sendWhatsAppMessage(chatId: string, message: string) {
  if (!GREEN_ID_INSTANCE || !GREEN_API_TOKEN_INSTANCE) {
    throw new Error("Missing Green API credentials.");
  }

  const url = `${GREEN_API_URL}/waInstance${GREEN_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Green API failed (${response.status}): ${details}`);
  }
}

async function notifyAdminOrderPlaced(params: {
  orderRef: string;
  paymentMethod: PaymentMethod;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: CheckoutItem[];
}) {
  if (!GREEN_ADMIN_CHAT_ID) return;

  const itemsLines = params.items.map(
    (item) =>
      `- ${item.title} | ${item.optionName} x${item.qty} | ${formatIls(item.unitPrice)}`
  );

  const message = [
    "התקבלה הזמנה חדשה מהאתר",
    "",
    `מספר הזמנה: ${params.orderRef}`,
    `אמצעי תשלום: ${paymentMethodLabel(params.paymentMethod)}`,
    `סכום: ${formatIls(params.amount)}`,
    "",
    `שם: ${params.customerName}`,
    `טלפון: ${params.customerPhone}`,
    `אימייל: ${params.customerEmail || "-"}`,
    "",
    "פריטים:",
    ...itemsLines,
  ].join("\n");

  await sendWhatsAppMessage(GREEN_ADMIN_CHAT_ID, message);
}

function phoneToChatId(phone: string) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0") && digits.length === 10) {
    digits = `972${digits.slice(1)}`;
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) return null;
  return `${digits}@c.us`;
}

async function notifyCustomerOrderPlaced(params: {
  orderRef: string;
  paymentMethod: PaymentMethod;
  amount: number;
  customerName: string;
  customerPhone: string;
}) {
  const customerChatId = phoneToChatId(params.customerPhone);
  if (!customerChatId) return;

  const followUpLine =
    params.paymentMethod === "cash"
      ? `תודה ${params.customerName}, ניצור איתך קשר בהקדם.`
      : `תודה ${params.customerName}, התשלום נקלט בהצלחה.`;

  const message = [
    "✅ ההזמנה שלך התקבלה בהצלחה",
    "",
    `מספר הזמנה: ${params.orderRef}`,
    `אמצעי תשלום: ${paymentMethodLabel(params.paymentMethod)}`,
    `סכום: ${formatIls(params.amount)}`,
    "",
    followUpLine,
  ].join("\n");

  await sendWhatsAppMessage(customerChatId, message);
}

function buildTranzilaUrl(params: {
  amount: number;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const terminal =
    process.env.TRANZILA_TERMINAL ||
    process.env.TRZ_TERMINAL_NAME ||
    process.env.TRANZILA_SUPPLIER ||
    "";
  if (!terminal) {
    throw new Error("TRANZILA_TERMINAL is not configured.");
  }

  const baseUrl = (process.env.TRANZILA_BASE_URL || "https://direct.tranzila.com").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/${terminal}/`);

  url.searchParams.set("sum", params.amount.toFixed(2));
  url.searchParams.set("currency", process.env.TRANZILA_CURRENCY || "1");
  url.searchParams.set("lang", process.env.TRANZILA_LANG || "il");
  url.searchParams.set("myid", params.orderRef);

  if (params.customerName) url.searchParams.set("contact", params.customerName);
  if (params.customerEmail) url.searchParams.set("email", params.customerEmail);
  if (params.customerPhone) url.searchParams.set("phone", params.customerPhone);

  if (process.env.TRANZILA_CRED_TYPE) {
    url.searchParams.set("cred_type", process.env.TRANZILA_CRED_TYPE);
  }

  if (process.env.TRANZILA_TRANMODE) {
    url.searchParams.set("tranmode", process.env.TRANZILA_TRANMODE);
  }

  if (process.env.TRANZILA_SUCCESS_URL) {
    url.searchParams.set("success_url_address", process.env.TRANZILA_SUCCESS_URL);
  }

  if (process.env.TRANZILA_ERROR_URL) {
    url.searchParams.set("error_url_address", process.env.TRANZILA_ERROR_URL);
  }

  if (process.env.TRANZILA_NOTIFY_URL) {
    url.searchParams.set("notify_url_address", process.env.TRANZILA_NOTIFY_URL);
  }

  return url.toString();
}

export async function POST(req: Request) {
  try {
    const guestId = getGuestId(req);
    if (!guestId) {
      return NextResponse.json({ ok: false, error: "Missing guest id." }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as CheckoutBody | null;
    const paymentMethod = parsePaymentMethod(body?.paymentMethod);
    if (!paymentMethod) {
      return NextResponse.json({ ok: false, error: "Invalid payment method." }, { status: 400 });
    }

    const customerName = asTrimmedString(body?.customer?.name);
    const customerPhone = asTrimmedString(body?.customer?.phone);
    const customerEmail = asTrimmedString(body?.customer?.email);
    if (!customerName || !customerPhone) {
      return NextResponse.json(
        {
          ok: false,
          error: "יש למלא שם וטלפון לפני השלמת הזמנה.",
        },
        { status: 400 }
      );
    }
    if (!hasMinPhoneDigits(customerPhone)) {
      return NextResponse.json(
        {
          ok: false,
          error: "יש להזין מספר טלפון תקין.",
        },
        { status: 400 }
      );
    }

    await dbConnect();
    const items = await hydrateCheckoutItems(guestId);
    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: "Cart is empty." }, { status: 400 });
    }

    const amount = calcTotal(items);
    if (amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid cart total." }, { status: 400 });
    }

    const orderRef = createOrderRef();
    const orderItems = toOrderItems(items);
    const redirectUrl =
      paymentMethod === "visa"
        ? buildTranzilaUrl({
            amount,
            orderRef,
            customerName,
            customerEmail,
            customerPhone,
          })
        : "";

    await Order.create({
      orderRef,
      guestId,
      paymentMethod,
      paymentStatus: paymentStatusFromMethod(paymentMethod),
      amount,
      currency: process.env.TRANZILA_CURRENCY || "1",
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      items: orderItems,
    });

    try {
      await notifyAdminOrderPlaced({
        orderRef,
        paymentMethod,
        amount,
        customerName,
        customerPhone,
        customerEmail,
        items,
      });
    } catch (notifyAdminError) {
      console.error("[api/checkout] admin whatsapp notify failed", notifyAdminError);
    }

    try {
      await notifyCustomerOrderPlaced({
        orderRef,
        paymentMethod,
        amount,
        customerName,
        customerPhone,
      });
    } catch (notifyCustomerError) {
      console.error("[api/checkout] customer whatsapp notify failed", notifyCustomerError);
    }

    if (paymentMethod === "cash") {
      await Cart.updateOne({ guestId }, { $set: { items: [] } });

      return NextResponse.json({
        ok: true,
        mode: "cash",
        orderRef,
        amount,
        message: "ההזמנה התקבלה. ניצור איתך קשר לתיאום תשלום במזומן.",
      });
    }

    return NextResponse.json({
      ok: true,
      mode: "visa",
      orderRef,
      amount,
      redirectUrl,
    });
  } catch (error) {
    console.error("[api/checkout] failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Checkout failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
