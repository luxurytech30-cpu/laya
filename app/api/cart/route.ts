import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { Product } from "@/models/Product";

type CartItemPayload = {
  productId: string;
  optionId: string;
  qty: number;
};

type CartItemView = {
  productId: string;
  optionId: string;
  qty: number;
  title: string;
  optionName: string;
  imageUrl: string;
  unitPrice: number;
  inStock: number;
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

type CartBody = {
  items?: unknown;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getGuestId(req: Request) {
  const guestId = req.headers.get("x-guest-id")?.trim() ?? "";
  if (!guestId) return "";
  if (guestId.length > 200) return "";
  return guestId;
}

function clampQty(raw: unknown) {
  const qty = Number(raw);
  if (!Number.isFinite(qty)) return 1;
  return Math.min(99, Math.max(1, Math.floor(qty)));
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

function dedupeItems(items: CartItemPayload[]) {
  const map = new Map<string, CartItemPayload>();

  for (const item of items) {
    const key = `${item.productId}:${item.optionId}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + item.qty);
      continue;
    }
    map.set(key, { ...item });
  }

  return Array.from(map.values());
}

function parseItems(raw: unknown): CartItemPayload[] {
  if (!Array.isArray(raw)) return [];

  const items: CartItemPayload[] = [];
  for (const entry of raw) {
    const candidate = (entry ?? {}) as {
      productId?: unknown;
      optionId?: unknown;
      qty?: unknown;
    };

    const productId = toObjectIdString(candidate.productId);
    const optionId = toObjectIdString(candidate.optionId);

    if (!productId || !optionId) {
      continue;
    }

    items.push({
      productId,
      optionId,
      qty: clampQty(candidate.qty),
    });
  }

  return dedupeItems(items);
}

function toPayloadItems(raw: unknown) {
  return parseItems(raw);
}

function toDbItems(items: CartItemPayload[]) {
  return items.map((item) => ({
    productId: new Types.ObjectId(item.productId),
    optionId: new Types.ObjectId(item.optionId),
    qty: item.qty,
  }));
}

function toComparable(items: CartItemPayload[]) {
  return items
    .map((item) => `${item.productId}:${item.optionId}:${item.qty}`)
    .sort()
    .join("|");
}

function calcCount(items: CartItemView[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

function calcSubtotal(items: CartItemView[]) {
  return items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

async function hydrateCartItems(items: CartItemPayload[]) {
  if (items.length === 0) {
    return { storedItems: [] as CartItemPayload[], viewItems: [] as CartItemView[] };
  }

  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const products = await Product.find({ _id: { $in: productIds } })
    .select({ title: 1, options: 1 })
    .lean<ProductLite[]>();

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const storedItems: CartItemPayload[] = [];
  const viewItems: CartItemView[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;

    const option = product.options.find((opt) => opt._id.toString() === item.optionId);
    if (!option) continue;

    const stockNumber = Number(option.inStock);
    const inStock = Number.isFinite(stockNumber) ? Math.max(0, Math.floor(stockNumber)) : 0;
    const qty = inStock > 0 ? Math.min(item.qty, inStock) : item.qty;
    const salePrice = typeof option.salePrice === "number" ? option.salePrice : null;
    const unitPrice = salePrice !== null && salePrice >= 0 ? salePrice : Number(option.price) || 0;

    storedItems.push({
      productId: product._id.toString(),
      optionId: option._id.toString(),
      qty,
    });

    viewItems.push({
      productId: product._id.toString(),
      optionId: option._id.toString(),
      qty,
      title: product.title,
      optionName: option.name,
      imageUrl: option.image?.url || "/placeholder.png",
      unitPrice,
      inStock,
    });
  }

  return { storedItems: dedupeItems(storedItems), viewItems };
}

function cartResponse(items: CartItemView[]) {
  return NextResponse.json({
    ok: true,
    items,
    count: calcCount(items),
    subtotal: calcSubtotal(items),
  });
}

export async function GET(req: Request) {
  try {
    const guestId = getGuestId(req);
    if (!guestId) {
      return NextResponse.json({ ok: false, message: "Missing guest id" }, { status: 400 });
    }

    await dbConnect();

    const cart = await Cart.findOne({ guestId }).select({ items: 1 }).lean<{ items?: unknown } | null>();
    if (!cart) return cartResponse([]);

    const stored = toPayloadItems(cart.items);
    const hydrated = await hydrateCartItems(stored);

    if (toComparable(stored) !== toComparable(hydrated.storedItems)) {
      await Cart.updateOne({ guestId }, { $set: { items: toDbItems(hydrated.storedItems) } });
    }

    return cartResponse(hydrated.viewItems);
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const guestId = getGuestId(req);
    if (!guestId) {
      return NextResponse.json({ ok: false, message: "Missing guest id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as CartBody | null;
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ ok: false, message: "Invalid items payload" }, { status: 400 });
    }

    await dbConnect();

    const inputItems = toPayloadItems(body.items);
    const hydrated = await hydrateCartItems(inputItems);

    await Cart.findOneAndUpdate(
      { guestId },
      { guestId, items: toDbItems(hydrated.storedItems) },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return cartResponse(hydrated.viewItems);
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const guestId = getGuestId(req);
    if (!guestId) {
      return NextResponse.json({ ok: false, message: "Missing guest id" }, { status: 400 });
    }

    await dbConnect();
    await Cart.deleteOne({ guestId });

    return cartResponse([]);
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
