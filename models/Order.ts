import mongoose, { Schema, Types } from "mongoose";

export type OrderPaymentMethod = "cash" | "visa";
export type OrderPaymentStatus = "pending_cash" | "pending_visa" | "paid" | "failed";

export type OrderCustomer = {
  name: string;
  phone: string;
  email: string;
};

export type OrderItemDoc = {
  productId: Types.ObjectId;
  optionId: Types.ObjectId;
  title: string;
  optionName: string;
  imageUrl: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDoc = {
  _id: Types.ObjectId;
  orderRef: string;
  guestId: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  amount: number;
  currency: string;
  customer: OrderCustomer;
  items: OrderItemDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const OrderCustomerSchema = new Schema<OrderCustomer>(
  {
    name: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const OrderItemSchema = new Schema<OrderItemDoc>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    optionId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    optionName: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true, default: "/placeholder.png" },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDoc>(
  {
    orderRef: { type: String, required: true, trim: true, unique: true, index: true },
    guestId: { type: String, required: true, trim: true, index: true },
    paymentMethod: { type: String, enum: ["cash", "visa"], required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ["pending_cash", "pending_visa", "paid", "failed"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, default: "1" },
    customer: { type: OrderCustomerSchema, required: true, default: { name: "", phone: "", email: "" } },
    items: { type: [OrderItemSchema], default: [] },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.models.Order || mongoose.model<OrderDoc>("Order", OrderSchema);
