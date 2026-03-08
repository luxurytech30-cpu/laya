import mongoose, { Schema, Types } from "mongoose";

export type UserDoc = {
  _id: Types.ObjectId;
  username: string;
  password: string; // NOT HASHED (dev only)
  role: "admin";
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // stored as plain text (dev only)
    role: { type: String, enum: ["admin"], default: "admin" },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<UserDoc>("User", UserSchema);