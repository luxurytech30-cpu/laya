import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { cloudinary } from "@/lib/cloudinary";

type Ctx = { params: Promise<{ id: string }> };

type CategoryBody = {
  name?: unknown;
  image?: {
    url?: unknown;
    publicId?: unknown;
  };
};

type CategoryUpdates = {
  name?: string;
  image?: { url: string; publicId: string };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    requireAdmin(req);
    await dbConnect();

    const { id } = await params;
    const existing = await Category.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as CategoryBody | null;
    const updates: CategoryUpdates = {};

    if (body?.name != null) {
      updates.name = String(body.name).trim();
    }

    if (body?.image != null) {
      const imageUrl = String(body.image?.url ?? "").trim();
      const imagePublicId = String(body.image?.publicId ?? "").trim();
      if (!imageUrl || !imagePublicId) {
        return NextResponse.json({ error: "נתוני התמונה אינם תקינים" }, { status: 400 });
      }
      updates.image = { url: imageUrl, publicId: imagePublicId };
    }

    if (updates.image?.publicId && existing.image?.publicId && updates.image.publicId !== existing.image.publicId) {
      try {
        await cloudinary.uploader.destroy(existing.image.publicId);
      } catch (error) {
        console.warn("Cloudinary destroy failed for category image:", existing.image.publicId, error);
      }
    }

    const updated = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "שגיאת שרת") },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    requireAdmin(req);
    await dbConnect();

    const { id } = await params;
    const item = await Category.findById(id);
    if (!item) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    const productsUsingCategory = await Product.countDocuments({ categoryId: id });
    if (productsUsingCategory > 0) {
      return NextResponse.json(
        { error: `לא ניתן למחוק קטגוריה זו כי יש בה ${productsUsingCategory} מוצרים.` },
        { status: 409 }
      );
    }

    if (item.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(item.image.publicId);
      } catch (error) {
        console.warn("Cloudinary destroy failed for category image:", item.image.publicId, error);
      }
    }

    await item.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "שגיאת שרת") },
      { status: 500 }
    );
  }
}
