// app/api/admin/products/[id]/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Product } from "@/models/Product";
import { cloudinary } from "@/lib/cloudinary";

type Ctx = { params: Promise<{ id: string }> };

// ---------- Types ----------
type ImageInput = {
  url?: unknown;
  publicId?: unknown;
};

type ProductOptionInput = {
  name?: unknown;
  image?: unknown; // { url, publicId }
  price?: unknown;
  salePrice?: unknown;
  inStock?: unknown;
};

type ProductOptionPayload = {
  name: string;
  image: { url: string; publicId: string };
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

type ProductUpdates = {
  title?: string;
  categoryId?: string;
  description?: string;
  top?: boolean;
  defaultOptionId?: string | null;
  options?: ProductOptionPayload[];
};

// ---------- Helpers ----------
function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type OptionsValidation =
  | { ok: true; options: ProductOptionPayload[] }
  | { ok: false; error: string };

function validateOptions(raw: unknown): OptionsValidation {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "At least one option is required" };
  }

  const options: ProductOptionPayload[] = raw.map((candidate) => {
    const o = (candidate ?? {}) as ProductOptionInput;

    const name = String(o.name ?? "").trim();

    const img = (o.image ?? {}) as ImageInput;
    const url = String(img.url ?? "").trim();
    const publicId = String(img.publicId ?? "").trim();

    const price = Number(o.price);
    const inStock = Number.isFinite(Number(o.inStock)) ? Number(o.inStock) : 0;

    let salePrice: number | null = null;
    if (o.salePrice !== undefined && o.salePrice !== null && String(o.salePrice).trim() !== "") {
      salePrice = Number(o.salePrice);
    }

    return { name, image: { url, publicId }, price, salePrice, inStock };
  });

  for (const opt of options) {
    if (!opt.name) return { ok: false, error: "Option name is required" };
    if (!opt.image?.url || !opt.image?.publicId) {
      return { ok: false, error: "Option image (url + publicId) is required" };
    }
    if (!Number.isFinite(opt.price)) return { ok: false, error: "Option price is required" };
    if (opt.price < 0) return { ok: false, error: "Price must be >= 0" };
    if (opt.salePrice != null) {
      if (!Number.isFinite(opt.salePrice)) return { ok: false, error: "Sale price must be a number" };
      if (opt.salePrice < 0) return { ok: false, error: "Sale price must be >= 0" };
      if (opt.salePrice > opt.price) return { ok: false, error: "Sale price must be <= price" };
    }
    if (opt.inStock < 0) return { ok: false, error: "Stock must be >= 0" };
  }

  return { ok: true, options };
}

function extractPublicIdsFromDoc(doc: any): string[] {
  const ids = (doc?.options || [])
    .map((o: any) => o?.image?.publicId)
    .filter(Boolean)
    .map(String);

  // dedupe
  return Array.from(new Set(ids));
}

function extractPublicIdsFromPayload(options: ProductOptionPayload[]): string[] {
  const ids = options.map((o) => o.image.publicId).filter(Boolean).map(String);
  return Array.from(new Set(ids));
}

// ---------- Handlers ----------
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    requireAdmin(req);
    await dbConnect();
    const { id } = await params;

    const existing = await Product.findById(id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => null)) as ProductBody | null;
    const updates: ProductUpdates = {};

    if (body?.title != null) updates.title = String(body.title).trim();
    if (body?.categoryId != null) updates.categoryId = String(body.categoryId).trim();
    if (body?.description != null) updates.description = String(body.description);
    if (body?.top != null) updates.top = !!body.top;

    if (body?.defaultOptionId !== undefined) {
      const v = String(body.defaultOptionId ?? "").trim();
      updates.defaultOptionId = v ? v : null;
    }

    // ✅ Options update + Cloudinary cleanup (removed/replaced images)
    if (body?.options != null) {
      const validation = validateOptions(body.options);
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

      const oldIds = new Set(extractPublicIdsFromDoc(existing));
      const newIds = new Set(extractPublicIdsFromPayload(validation.options));

      // delete = old - new
      const toDelete = [...oldIds].filter((pid) => !newIds.has(pid));

      // Best-effort delete (do not fail whole request if Cloudinary fails)
      await Promise.all(
        toDelete.map(async (publicId) => {
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (e) {
            console.warn("Cloudinary destroy failed:", publicId, e);
          }
        })
      );

      updates.options = validation.options;
    }

    const item = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ensure defaultOptionId exists
    if (item.defaultOptionId) {
      const exists = item.options.some((o: any) => String(o._id) === String(item.defaultOptionId));
      if (!exists) {
        item.defaultOptionId = item.options?.[0]?._id ?? null;
        await item.save();
      }
    } else {
      item.defaultOptionId = item.options?.[0]?._id ?? null;
      await item.save();
    }

    return NextResponse.json({ item });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    requireAdmin(req);
    await dbConnect();
    const { id } = await params;

    const item = await Product.findById(id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // delete all option images
    const publicIds = extractPublicIdsFromDoc(item);

    await Promise.all(
      publicIds.map(async (publicId) => {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {
          console.warn("Cloudinary destroy failed:", publicId, e);
        }
      })
    );

    await item.deleteOne();

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}