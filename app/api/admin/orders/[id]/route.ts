import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";
import { Order } from "@/models/Order";

type Ctx = { params: Promise<{ id: string }> };

type Body = {
  paymentStatus?: unknown;
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
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const nextStatus = String(body?.paymentStatus ?? "").trim();
    if (nextStatus !== "paid") {
      return NextResponse.json({ error: "Only paymentStatus='paid' is allowed here" }, { status: 400 });
    }

    const order = await Order.findById(id).select({ paymentMethod: 1, paymentStatus: 1 });
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (order.paymentMethod !== "cash") {
      return NextResponse.json({ error: "Only cash orders can be updated manually" }, { status: 400 });
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.json({ item: order });
    }

    if (order.paymentStatus !== "pending_cash") {
      return NextResponse.json({ error: "Only pending cash orders can be marked paid" }, { status: 400 });
    }

    order.paymentStatus = "paid";
    await order.save();

    return NextResponse.json({ item: order });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
