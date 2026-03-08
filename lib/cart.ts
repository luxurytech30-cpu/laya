"use client";

export const GUEST_ID_STORAGE_KEY = "lt_guest_id";
export const CART_STORAGE_KEY = "lt_cart_v1";
const CART_CHANGE_EVENT = "lt-cart-change";

export type CartItem = {
  productId: string;
  optionId: string;
  qty: number;
  title: string;
  optionName: string;
  imageUrl: string;
  unitPrice: number;
  inStock: number;
};

export type AddToCartInput = {
  productId: string;
  optionId: string;
  qty?: number;
  title: string;
  optionName: string;
  imageUrl: string;
  unitPrice: number;
};

type CartApiResponse = {
  ok?: unknown;
  items?: unknown;
};

function inBrowser() {
  return typeof window !== "undefined";
}

function clampQty(qty: number) {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(99, Math.max(1, Math.floor(qty)));
}

function createGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emitCartChange() {
  if (!inBrowser()) return;
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];

  try {
    return parseCartItems(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function parseCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!isRecord(item)) return null;

      const productId = typeof item.productId === "string" ? item.productId : "";
      const optionId = typeof item.optionId === "string" ? item.optionId : "";
      const title = typeof item.title === "string" ? item.title : "";
      const optionName = typeof item.optionName === "string" ? item.optionName : "";
      const imageUrl = typeof item.imageUrl === "string" ? item.imageUrl : "/placeholder.png";
      const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      const qtyValue = typeof item.qty === "number" ? item.qty : 1;
      const inStockValue = typeof item.inStock === "number" ? item.inStock : 0;

      if (!productId || !optionId || !title || !optionName) return null;
      if (!Number.isFinite(unitPrice)) return null;

      return {
        productId,
        optionId,
        title,
        optionName,
        imageUrl,
        unitPrice: Math.max(0, unitPrice),
        qty: clampQty(qtyValue),
        inStock: Math.max(0, Math.floor(inStockValue)),
      };
    })
    .filter((item): item is CartItem => item !== null);
}

function writeCart(items: CartItem[]) {
  if (!inBrowser()) return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartChange();
}

function readCart() {
  if (!inBrowser()) return [];
  return parseCart(localStorage.getItem(CART_STORAGE_KEY));
}

function toServerItems(items: CartItem[]) {
  return items.map((item) => ({
    productId: item.productId,
    optionId: item.optionId,
    qty: clampQty(item.qty),
  }));
}

async function requestCart(method: "GET" | "PUT" | "DELETE", items?: CartItem[]) {
  const guestId = getOrCreateGuestId();
  const headers: Record<string, string> = {
    "x-guest-id": guestId,
  };

  const init: RequestInit = { method, headers };
  if (method === "PUT") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify({ items: toServerItems(items ?? []) });
  }

  const response = await fetch("/api/cart", init);
  const json = (await response.json().catch(() => null)) as CartApiResponse | null;

  if (!response.ok) {
    throw new Error("Cart request failed");
  }

  return parseCartItems(json?.items);
}

let mutationQueue: Promise<CartItem[]> = Promise.resolve([]);

function enqueueMutation(task: () => Promise<CartItem[]>) {
  mutationQueue = mutationQueue
    .catch(() => readCart())
    .then(task)
    .catch((error: unknown) => {
      console.error(error);
      return readCart();
    });

  return mutationQueue;
}

export function getOrCreateGuestId() {
  if (!inBrowser()) return "";

  const existing = localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (existing) return existing;

  const guestId = createGuestId();
  localStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
  return guestId;
}

export function getCartItems() {
  return readCart();
}

export function getCartCount() {
  return getCartItems().reduce((sum, item) => sum + item.qty, 0);
}

export async function syncCartFromServer() {
  if (!inBrowser()) return [];

  try {
    const localItems = readCart();
    const serverItems = await requestCart("GET");

    if (serverItems.length === 0 && localItems.length > 0) {
      const merged = await requestCart("PUT", localItems);
      writeCart(merged);
      return merged;
    }

    writeCart(serverItems);
    return serverItems;
  } catch (error: unknown) {
    console.error(error);
    return readCart();
  }
}

export function addToCart(input: AddToCartInput) {
  if (!inBrowser()) return Promise.resolve([]);

  const items = readCart();
  const qty = clampQty(input.qty ?? 1);

  const index = items.findIndex((item) => item.productId === input.productId && item.optionId === input.optionId);
  if (index >= 0) {
    items[index] = { ...items[index], qty: clampQty(items[index].qty + qty) };
  } else {
    items.push({
      productId: input.productId,
      optionId: input.optionId,
      qty,
      title: input.title,
      optionName: input.optionName,
      imageUrl: input.imageUrl,
      unitPrice: input.unitPrice,
      inStock: 0,
    });
  }

  writeCart(items);
  const optimistic = [...items];

  return enqueueMutation(async () => {
    const serverItems = await requestCart("PUT", optimistic);
    writeCart(serverItems);
    return serverItems;
  });
}

export function setCartQty(productId: string, optionId: string, qty: number) {
  if (!inBrowser()) return Promise.resolve([]);

  const items = readCart();
  const index = items.findIndex((item) => item.productId === productId && item.optionId === optionId);
  if (index < 0) return Promise.resolve(items);

  if (qty <= 0) {
    items.splice(index, 1);
  } else {
    items[index] = { ...items[index], qty: clampQty(qty) };
  }

  writeCart(items);
  const optimistic = [...items];

  return enqueueMutation(async () => {
    const serverItems = await requestCart("PUT", optimistic);
    writeCart(serverItems);
    return serverItems;
  });
}

export function removeFromCart(productId: string, optionId: string) {
  if (!inBrowser()) return Promise.resolve([]);

  const items = readCart().filter((item) => !(item.productId === productId && item.optionId === optionId));
  writeCart(items);
  const optimistic = [...items];

  return enqueueMutation(async () => {
    const serverItems = await requestCart("PUT", optimistic);
    writeCart(serverItems);
    return serverItems;
  });
}

export function clearCart() {
  if (!inBrowser()) return Promise.resolve([]);

  writeCart([]);

  return enqueueMutation(async () => {
    const serverItems = await requestCart("DELETE");
    writeCart(serverItems);
    return serverItems;
  });
}

export function subscribeCartChange(listener: () => void) {
  if (!inBrowser()) return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) listener();
  };
  const onCustom = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(CART_CHANGE_EVENT, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CART_CHANGE_EVENT, onCustom);
  };
}
