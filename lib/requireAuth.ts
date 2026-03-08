import { verifyToken } from "@/lib/auth";

export function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const parts = h.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

export function requireAdmin(req: Request) {
  const token = getBearerToken(req);
  if (!token) throw new Error("NO_TOKEN");
  const payload = verifyToken(token);
  if (payload.role !== "admin") throw new Error("NOT_ADMIN");
  return payload;
}