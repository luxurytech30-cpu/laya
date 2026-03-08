import mongoose, { Schema, Types } from "mongoose";

export type CategoryDoc = {
  _id: Types.ObjectId;
  name: string;     // Hebrew display
  
  createdAt: Date;
  updatedAt: Date;
};

const CategorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category || mongoose.model<CategoryDoc>("Category", CategorySchema);
