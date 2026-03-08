import { NextResponse } from "next/server";
import {dbConnect} from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const categoryId = (searchParams.get("categoryId") || "").trim();
    const top = (searchParams.get("top") || "").trim(); // "1" or ""
    const sort = (searchParams.get("sort") || "new"); // new | price_asc | price_desc | title

    const filter: any = {};
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { "options.name": { $regex: q, $options: "i" } },
      ];
    }
    if (categoryId) filter.categoryId = categoryId;
    if (top === "1") filter.top = true;

    let sortObj: any = { createdAt: -1 };
    if (sort === "title") sortObj = { title: 1 };
    // NOTE: sorting by min option price in Mongo is heavier; we’ll do it client-side
    // but we still keep "new" and "title" server-side.

    const [products, categories] = await Promise.all([
      Product.find(filter).sort(sortObj).lean(),
      Category.find({}).sort({ name: 1 }).lean(),
    ]);

    return NextResponse.json({ ok: true, products, categories });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, message: err?.message || "Error" }, { status: 500 });
  }
}