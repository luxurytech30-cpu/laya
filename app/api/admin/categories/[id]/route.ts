import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Category } from "@/models/Category";

type Ctx = { params: Promise<{ id: string }> };

type CategoryUpdates = {
  name?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    requireAdmin(req);
    await dbConnect();

    const { id } = await params;   // ✅ unwrap params

    const body = await req.json().catch(() => null);
    const updates: CategoryUpdates = {};

    if (body?.name != null) updates.name = String(body.name).trim();

    const updated = await Category.findByIdAndUpdate(id, updates, { new: true });

    if (!updated) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ item: updated });
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

    const { id } = await params;   // ✅ unwrap params

    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
