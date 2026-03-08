import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Category } from "@/models/Category";

type CategoryBody = {
  name?: unknown;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getAuthStatus(message: string) {
  return message === "NO_TOKEN" || message === "NOT_ADMIN" ? 401 : 500;
}

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    await dbConnect();

    const items = await Category.find().sort({ createdAt: -1 });
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

    const body = (await req.json().catch(() => null)) as CategoryBody | null;
    const name = String(body?.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    const item = await Category.create({ name });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
