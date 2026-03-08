import { v2 as cloudinary } from "cloudinary";

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

cloudinary.config({
  cloud_name: must("CLOUDINARY_CLOUD_NAME"),
  api_key: must("CLOUDINARY_API_KEY"),
  api_secret: must("CLOUDINARY_API_SECRET"),
});

export { cloudinary };