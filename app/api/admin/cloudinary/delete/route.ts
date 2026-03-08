import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAuth";
import { cloudinary } from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    requireAdmin(req);

    const body = await req.json().catch(() => null);
    const publicId = String(body?.publicId ?? "").trim();
    if (!publicId) return NextResponse.json({ error: "Missing publicId" }, { status: 400 });

    await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}