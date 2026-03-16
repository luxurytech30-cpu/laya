import mongoose, { Schema, Types } from "mongoose";

export type CategoryImage = {
  url: string;
  publicId: string;
};

export type CategoryDoc = {
  _id: Types.ObjectId;
  name: string;
  image: CategoryImage;
  createdAt: Date;
  updatedAt: Date;
};

const CategoryImageSchema = new Schema<CategoryImage>(
  {
    url: { type: String, trim: true, default: "" },
    publicId: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const CategorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
    image: { type: CategoryImageSchema, default: { url: "", publicId: "" } },
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category || mongoose.model<CategoryDoc>("Category", CategorySchema);
