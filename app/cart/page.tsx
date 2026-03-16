"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearCart,
  getCartItems,
  getOrCreateGuestId,
  removeFromCart,
  setCartQty,
  subscribeCartChange,
  syncCartFromServer,
  type CartItem,
} from "@/lib/cart";

type PaymentMethod = "cash" | "visa";

const TEXT = {
  title: "עגלה",
  items: "פריטים",
  clearCart: "ניקוי עגלה",
  emptyTitle: "העגלה ריקה",
  emptyDesc: "הוסיפו מוצרים מהקטלוג כדי להתחיל.",
  toProducts: "מעבר למוצרים",
  option: "אפשרות",
  remove: "הסרה",
  subtotal: "סכום ביניים",
  payment: "תשלום",
  cash: "מזומן",
  visa: "ויזה",
  fullName: "שם מלא",
  phone: "טלפון",
  email: "אימייל",
  visaHelp:
    "בלחיצה על השלמת הזמנה תעברו לעמוד סליקה מאובטח של Tranzila.",
  cashHelp:
    "נציג יחזור אליכם לתיאום הזמנה ותשלום במזומן.",
  requiredNamePhone:
    "יש למלא שם וטלפון לפני השלמת הזמנה.",
  defaultError:
    "לא ניתן להשלים את התשלום כרגע. נסו שוב בעוד רגע.",
  defaultSuccess: "ההזמנה התקבלה בהצלחה.",
  processing: "מעבד תשלום...",
  toVisa: "מעבר לתשלום בויזה",
  completeCash: "השלמת הזמנה במזומן",
  stockLimit: "לא ניתן להוסיף מעבר למלאי הזמין.",
};

function getCartItemKey(productId: string, optionId: string) {
  return `${productId}:${optionId}`;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [cartQtyError, setCartQtyError] = useState("");
  const [updatingQtyKeys, setUpdatingQtyKeys] = useState<Record<string, boolean>>({});
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const sync = () => {
      setItems(getCartItems());
    };

    sync();
    void syncCartFromServer().then(() => {
      sync();
    });

    return subscribeCartChange(sync);
  }, []);

  useEffect(() => {
    setQtyInputs((prev) => {
      const next: Record<string, string> = {};
      for (const item of items) {
        const itemKey = getCartItemKey(item.productId, item.optionId);
        next[itemKey] = updatingQtyKeys[itemKey] ? (prev[itemKey] ?? String(item.qty)) : String(item.qty);
      }
      return next;
    });
  }, [items, updatingQtyKeys]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [items]);
  const hasRequiredCustomer = customerName.trim().length > 0 && customerPhone.trim().length > 0;
  const activeFeedback = cartQtyError || checkoutError || checkoutMessage;
  const feedbackKind = cartQtyError || checkoutError ? "error" : "success";

  async function updateItemQty(item: CartItem, requestedQty: number) {
    const itemKey = getCartItemKey(item.productId, item.optionId);
    if (updatingQtyKeys[itemKey]) return;

    let targetQty = Number.isFinite(requestedQty) ? Math.floor(requestedQty) : item.qty;
    if (targetQty < 0) targetQty = 0;

    if (targetQty > 0 && item.inStock > 0 && targetQty > item.inStock) {
      setCartQtyError(TEXT.stockLimit);
      targetQty = item.inStock;
    } else if (targetQty > 0 && item.inStock <= 0) {
      setCartQtyError(TEXT.stockLimit);
      return;
    } else {
      setCartQtyError("");
    }

    if (targetQty === item.qty) {
      setQtyInputs((prev) => ({ ...prev, [itemKey]: String(item.qty) }));
      return;
    }

    setUpdatingQtyKeys((prev) => ({ ...prev, [itemKey]: true }));

    try {
      const updatedItems = await setCartQty(item.productId, item.optionId, targetQty);
      const updatedQty =
        updatedItems.find(
          (updatedItem) => updatedItem.productId === item.productId && updatedItem.optionId === item.optionId
        )?.qty ?? 0;

      if (targetQty > 0 && updatedQty < targetQty) {
        setCartQtyError(TEXT.stockLimit);
      }

      setQtyInputs((prev) => {
        if (updatedQty <= 0) {
          if (!(itemKey in prev)) return prev;
          const next = { ...prev };
          delete next[itemKey];
          return next;
        }
        if (prev[itemKey] === String(updatedQty)) return prev;
        return { ...prev, [itemKey]: String(updatedQty) };
      });
    } finally {
      setUpdatingQtyKeys((prev) => {
        if (!prev[itemKey]) return prev;
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
    }
  }

  function commitQtyInput(item: CartItem) {
    const itemKey = getCartItemKey(item.productId, item.optionId);
    const raw = qtyInputs[itemKey]?.trim();
    if (!raw) {
      setQtyInputs((prev) => ({ ...prev, [itemKey]: String(item.qty) }));
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setQtyInputs((prev) => ({ ...prev, [itemKey]: String(item.qty) }));
      return;
    }

    const clampedQty = Math.min(99, Math.max(1, parsed));
    void updateItemQty(item, clampedQty);
  }

  async function handleCheckout() {
    if (isCheckingOut || items.length === 0) return;
    setCartQtyError("");
    if (!hasRequiredCustomer) {
      setCheckoutError(TEXT.requiredNamePhone);
      setCheckoutMessage("");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError("");
    setCheckoutMessage("");

    try {
      const guestId = getOrCreateGuestId();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-guest-id": guestId,
        },
        body: JSON.stringify({
          paymentMethod,
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
          },
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            mode?: PaymentMethod;
            redirectUrl?: string;
            message?: string;
            error?: string;
          }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Checkout failed.");
      }

      if (data.mode === "visa" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      await clearCart();
      setCheckoutMessage(data?.message || TEXT.defaultSuccess);
    } catch (error: unknown) {
      console.error("[cart] checkout failed", error);
      const message = error instanceof Error && error.message ? error.message : TEXT.defaultError;
      setCheckoutError(message);
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="lux-shell">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="lux-card rounded-3xl p-6 md:p-8 lux-appear">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="lux-heading text-2xl md:text-3xl text-(--lux-gold-soft)">{TEXT.title}</h1>
              <div className="text-sm text-white/70">
                {totalItems} {TEXT.items}
              </div>
            </div>

            {items.length > 0 ? (
              <button
                type="button"
                className="lux-button lux-button--ghost rounded-2xl px-4 py-2 text-sm font-extrabold"
                onClick={() => {
                  void clearCart();
                }}
              >
                {TEXT.clearCart}
              </button>
            ) : null}
          </div>

          <div className="mt-6 lux-line" />

          {items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-(--lux-border) bg-black/30 p-6">
              <h2 className="lux-heading text-xl text-white">{TEXT.emptyTitle}</h2>
              <p className="mt-2 text-sm text-white/70">{TEXT.emptyDesc}</p>
              <Link href="/products" className="lux-button mt-5 inline-flex rounded-2xl px-5 py-2.5 text-sm font-extrabold">
                {TEXT.toProducts}
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map((item) => {
                const itemKey = getCartItemKey(item.productId, item.optionId);
                const isQtyUpdating = Boolean(updatingQtyKeys[itemKey]);
                return (
                  <div
                    key={itemKey}
                    className="flex flex-col gap-4 rounded-2xl border border-(--lux-border) bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl || "/placeholder.png"} alt={item.title} className="h-18 w-18 rounded-xl object-cover" />
                      <div>
                        <Link href={`/products/${item.productId}`} className="lux-heading text-lg text-white hover:text-(--lux-gold-soft)">
                          {item.title}
                        </Link>
                        <div className="mt-1 text-xs text-white/65">
                          {TEXT.option}: {item.optionName}
                        </div>
                        <div className="mt-1 text-sm font-bold text-(--lux-gold-soft)">
                          ₪
                          {item.unitPrice.toFixed(0)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void updateItemQty(item, item.qty + 1);
                        }}
                        disabled={isQtyUpdating}
                        className="lux-button rounded-xl px-3 py-2 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        +
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label="כמות"
                        value={qtyInputs[itemKey] ?? String(item.qty)}
                        onChange={(event) => {
                          const digitsOnly = event.target.value.replace(/[^\d]/g, "");
                          setQtyInputs((prev) => ({ ...prev, [itemKey]: digitsOnly }));
                        }}
                        onBlur={() => {
                          commitQtyInput(item);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                        }}
                        disabled={isQtyUpdating}
                        className="w-14 rounded-xl border border-(--lux-border) bg-black/25 px-2 py-2 text-center text-sm font-extrabold text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void updateItemQty(item, item.qty - 1);
                        }}
                        disabled={isQtyUpdating}
                        className="lux-button lux-button--ghost rounded-xl px-3 py-2 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCartQtyError("");
                          void removeFromCart(item.productId, item.optionId);
                        }}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-white/70 hover:text-white"
                      >
                        {TEXT.remove}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--lux-border) bg-black/35 p-4">
                <div className="text-sm text-white/70">{TEXT.subtotal}</div>
                <div className="text-2xl font-extrabold text-(--lux-gold-soft)">
                  ₪
                  {subtotal.toFixed(0)}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-(--lux-border) bg-black/30 p-4">
                <h2 className="lux-heading text-lg text-white">{TEXT.payment}</h2>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
                      paymentMethod === "cash"
                        ? "border-(--lux-gold-soft) bg-[rgba(205,165,59,0.16)] text-white"
                        : "border-(--lux-border) bg-black/25 text-white/80 hover:text-white",
                    ].join(" ")}
                  >
                    {TEXT.cash}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("visa")}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-extrabold transition",
                      paymentMethod === "visa"
                        ? "border-(--lux-gold-soft) bg-[rgba(205,165,59,0.16)] text-white"
                        : "border-(--lux-border) bg-black/25 text-white/80 hover:text-white",
                    ].join(" ")}
                  >
                    {TEXT.visa} 
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder={TEXT.fullName}
                    required
                    className="w-full rounded-xl border border-(--lux-border) bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder={TEXT.phone}
                    required
                    dir="ltr"
                    className="w-full rounded-xl border border-(--lux-border) bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                  <input
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder={TEXT.email}
                    type="email"
                    dir="ltr"
                    className="w-full rounded-xl border border-(--lux-border) bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                </div>

                {paymentMethod === "visa" ? (
                  <p className="mt-3 text-xs text-white/65">{TEXT.visaHelp}</p>
                ) : (
                  <p className="mt-3 text-xs text-white/65">{TEXT.cashHelp}</p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    void handleCheckout();
                  }}
                  disabled={isCheckingOut || items.length === 0}
                  className="lux-button mt-4 w-full rounded-2xl py-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCheckingOut ? TEXT.processing : paymentMethod === "visa" ? TEXT.toVisa : TEXT.completeCash}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {activeFeedback ? (
        <div
          role={feedbackKind === "error" ? "alert" : "status"}
          className={[
            "fixed top-4 right-4 left-4 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl sm:left-auto sm:w-104",
            feedbackKind === "error"
              ? "border-rose-300/35 bg-rose-950/85 text-rose-100"
              : "border-emerald-300/35 bg-emerald-950/85 text-emerald-100",
          ].join(" ")}
        >
          {activeFeedback}
        </div>
      ) : null}
    </div>
  );
}
