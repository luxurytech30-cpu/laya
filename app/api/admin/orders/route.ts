import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";

type ProductOptionImageLite = {
  _id: Types.ObjectId;
  image?: {
    url?: string;
  };
};

type ProductImageLite = {
  _id: Types.ObjectId;
  options: ProductOptionImageLite[];
};

type AdminOrderItemLite = {
  productId?: unknown;
  optionId?: unknown;
  imageUrl?: unknown;
} & Record<string, unknown>;

type AdminOrderLite = {
  items?: AdminOrderItemLite[];
} & Record<string, unknown>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getAuthStatus(message: string) {
  return message === "NO_TOKEN" || message === "NOT_ADMIN" ? 401 : 500;
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

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    await dbConnect();

    const items = await Order.find()
      .select({ guestId: 0 })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean<AdminOrderLite[]>();

    const productIds = Array.from(
      new Set(
        items.flatMap((order) => (order.items ?? []).map((item) => toObjectIdString(item.productId)).filter(Boolean))
      )
    );

    if (productIds.length === 0) {
      return NextResponse.json({ items });
    }

    const products = await Product.find({ _id: { $in: productIds } })
      .select({ options: 1 })
      .lean<ProductImageLite[]>();

    const optionImageMap = new Map<string, string>();
    for (const product of products) {
      for (const option of product.options) {
        const imageUrl = option.image?.url?.trim() || "";
        if (!imageUrl) continue;
        optionImageMap.set(`${product._id.toString()}:${option._id.toString()}`, imageUrl);
      }
    }

    const enriched = items.map((order) => {
      const nextItems = (order.items ?? []).map((item) => {
        const existingImageUrl = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
        if (existingImageUrl) return item;

        const productId = toObjectIdString(item.productId);
        const optionId = toObjectIdString(item.optionId);
        const fallbackImageUrl = optionImageMap.get(`${productId}:${optionId}`) || "/placeholder.png";

        return {
          ...item,
          imageUrl: fallbackImageUrl,
        };
      });

      return {
        ...order,
        items: nextItems,
      };
    });

    return NextResponse.json({ items: enriched });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Unauthorized");
    return NextResponse.json({ error: message }, { status: getAuthStatus(message) });
  }
}
