import mongoose, { Schema, Types } from "mongoose";

export type ProductImage = {
  url: string;
  publicId: string;
};

export type ProductOption = {
  _id: Types.ObjectId;
  name: string;
  image: ProductImage;      // ✅ object not string
  price: number;
  salePrice?: number | null;
  inStock: number;
};

export type ProductDoc = {
  _id: Types.ObjectId;
  title: string;
  categoryId: Types.ObjectId;
  description?: string;

  top: boolean;
  defaultOptionId?: Types.ObjectId | null;

  options: ProductOption[];

  createdAt: Date;
  updatedAt: Date;
};

const ProductImageSchema = new Schema<ProductImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ProductOptionSchema = new Schema<ProductOption>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: ProductImageSchema, required: true },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, default: null, min: 0 },
    inStock: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const ProductSchema = new Schema<ProductDoc>(
  {
    title: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    description: { type: String, default: "" },

    top: { type: Boolean, default: false },
    defaultOptionId: { type: Schema.Types.ObjectId, default: null },

    options: { type: [ProductOptionSchema], default: [] },
  },
  { timestamps: true }
);

export const Product =
  mongoose.models.Product || mongoose.model<ProductDoc>("Product", ProductSchema);