import mongoose, { Schema, Types } from "mongoose";

export type CartItemDoc = {
  productId: Types.ObjectId;
  optionId: Types.ObjectId;
  qty: number;
};

export type CartDoc = {
  _id: Types.ObjectId;
  guestId: string;
  items: CartItemDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const CartItemSchema = new Schema<CartItemDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    optionId: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const CartSchema = new Schema<CartDoc>(
  {
    guestId: { type: String, required: true, trim: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Cart = mongoose.models.Cart || mongoose.model<CartDoc>("Cart", CartSchema);
