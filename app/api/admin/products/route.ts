import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Product } from "@/models/Product";

type CloudImageInput = {
  url?: unknown;
  publicId?: unknown;
};

type ProductOptionInput = {
  name?: unknown;
  image?: unknown; // will be {url, publicId}
  price?: unknown;
  salePrice?: unknown;
  inStock?: unknown;
  _id?: unknown;
};

type CloudImagePayload = {
  url: string;
  publicId: string;
};

type ProductOptionPayload = {
  name: string;
  image: CloudImagePayload; // ✅ object
  price: number;
  salePrice?: number | null;
  inStock: number;
};

type ProductBody = {
  title?: unknown;
  categoryId?: unknown;
  description?: unknown;
  top?: unknown;
  defaultOptionId?: unknown;
  options?: unknown;
};

type OptionsValidation =
  | { ok: true; options: ProductOptionPayload[] }
  | { ok: false; error: string };

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getAuthStatus(message: string) {
  return message === "NO_TOKEN" || message === "NOT_ADMIN" ? 401 : 500;
}

function parseCloudImage(raw: unknown): CloudImagePayload | null {
  const img = (raw ?? {}) as CloudImageInput;
  const url = String(img.url ?? "").trim();
  const publicId = String(img.publicId ?? "").trim();
  if (!url || !publicId) return null;
  return { url, publicId };
}

function validateOptions(raw: unknown): OptionsValidation {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "At least one option is required" };
  }

  const options: ProductOptionPayload[] = raw.map((candidate) => {
    const option = (candidate ?? {}) as ProductOptionInput;

    const name = String(option.name ?? "").trim();

    const imageObj = parseCloudImage(option.image);
    const image = imageObj ?? { url: "", publicId: "" }; // placeholder for now

    const price = Number(option.price);
    const inStock = Number.isFinite(Number(option.inStock)) ? Number(option.inStock) : 0;

    let salePrice: number | null = null;
    if (
      option.salePrice !== undefined &&
      option.salePrice !== null &&
      String(option.salePrice).trim() !== ""
    ) {
      salePrice = Number(option.salePrice);
    }

    return { name, image, price, salePrice, inStock };
  });

  for (const option of options) {
    const hasImage = !!option.image?.url && !!option.image?.publicId;

    if (!option.name || !hasImage || !Number.isFinite(option.price)) {
      return { ok: false, error: "Invalid option: name/image/price are required" };
    }

    if (option.price < 0) return { ok: false, error: "Price must be >= 0" };

    if (option.salePrice != null && option.salePrice < 0) {
      return { ok: false, error: "Sale price must be >= 0" };
    }
    if (option.salePrice != null && option.salePrice > option.price) {
      return { ok: false, error: "Sale price must be <= price" };
    }

    if (option.inStock < 0) return { ok: false, error: "Stock must be >= 0" };
  }

  return { ok: true, options };
}

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    await dbConnect();

    const items = await Product.find().sort({ createdAt: -1 });
    return NextResponse.json({ items });
  } catch (error: unknown) {
    const message = getErrorMessage(error, "Unauthorized");
    return NextResponse.json({ error: message }, { status: getAuthStatus(message) });
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    await dbConnect();

    const body = (await req.json().catch(() => null)) as ProductBody | null;

    const title = String(body?.title ?? "").trim();
    const categoryId = String(body?.categoryId ?? "").trim();
    const description = String(body?.description ?? "");
    const top = !!body?.top;

    if (!title || !categoryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validation = validateOptions(body?.options);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const item = await Product.create({
      title,
      categoryId,
      description,
      top,
      options: validation.options,
      defaultOptionId: null,
    });

    // set first option as default
    if (item.options?.[0]?._id) {
      item.defaultOptionId = item.options[0]._id;
      await item.save();
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}