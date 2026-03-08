"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { addToCart, getCartItems } from "@/lib/cart";

type Img = { url: string; publicId: string };

type ProductOption = {
  _id: string;
  name: string;
  image: Img;
  price: number;
  salePrice?: number | null;
  inStock: number;
};

type Product = {
  _id: string;
  title: string;
  categoryId: string;
  description?: string;
  top: boolean;
  defaultOptionId?: string | null;
  options: ProductOption[];
};
type FeedbackState = { kind: "success" | "error"; message: string } | null;

function optionFinalPrice(opt: ProductOption) {
  const sale = typeof opt.salePrice === "number" ? opt.salePrice : null;
  return sale !== null && sale >= 0 ? sale : opt.price;
}

function getDefaultOption(product: Product) {
  if (product.defaultOptionId) {
    const found = product.options.find((o) => o._id === product.defaultOptionId);
    if (found) return found;
  }
  return product.options
    .slice()
    .sort((a, b) => optionFinalPrice(a) - optionFinalPrice(b))[0] || null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  function showFeedback(kind: "success" | "error", message: string) {
    setFeedback({ kind, message });
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 2200);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
        const data = await res.json();

        if (data?.ok && data.product) {
          setProduct(data.product);

          const def = getDefaultOption(data.product);
          setSelectedOptionId(def?._id || (data.product.options?.[0]?._id ?? ""));
        } else {
          setProduct(null);
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  const selectedOption = useMemo(() => {
    if (!product) return null;
    return product.options.find((o) => o._id === selectedOptionId) || null;
  }, [product, selectedOptionId]);

  const productsHref = useMemo(() => {
    const query = searchParams.toString();
    return query ? `/products?${query}` : "/products";
  }, [searchParams]);

  function handleBackToProducts() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(productsHref);
  }

  useEffect(() => {
    setAddSuccess(false);
  }, [selectedOptionId, product?._id]);

  async function handleAddToCart() {
    if (!product || !selectedOption || selectedOption.inStock <= 0) return;

    const existingQty =
      getCartItems().find((item) => item.productId === product._id && item.optionId === selectedOption._id)?.qty ?? 0;
    if (existingQty >= selectedOption.inStock) {
      setAddSuccess(false);
      showFeedback("error", "לא ניתן להוסיף מעבר למלאי הזמין");
      return;
    }

    setAddSuccess(false);
    setIsAdding(true);
    try {
      const updatedItems = await addToCart({
        productId: product._id,
        optionId: selectedOption._id,
        qty: 1,
        title: product.title,
        optionName: selectedOption.name,
        imageUrl: selectedOption.image?.url || product.options?.[0]?.image?.url || "/placeholder.png",
        unitPrice: optionFinalPrice(selectedOption),
      });

      const updatedQty =
        updatedItems.find((item) => item.productId === product._id && item.optionId === selectedOption._id)?.qty ?? 0;
      if (updatedQty <= existingQty) {
        setAddSuccess(false);
        showFeedback("error", "לא ניתן להוסיף מעבר למלאי הזמין");
        return;
      }

      setAddSuccess(true);
      showFeedback("success", "המוצר נוסף לסל");
    } catch {
      setAddSuccess(false);
      showFeedback("error", "לא הצלחנו להוסיף לסל. נסו שוב.");
    } finally {
      setIsAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="lux-shell">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="lux-card rounded-3xl p-8 animate-pulse">
            <div className="h-72 rounded-2xl bg-white/5" />
            <div className="mt-6 h-5 w-2/3 rounded bg-white/5" />
            <div className="mt-3 h-4 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="lux-shell">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="lux-card rounded-3xl p-8">
            <h1 className="lux-heading text-2xl text-(--lux-gold-soft)">המוצר לא נמצא</h1>
            <button className="lux-button mt-6 rounded-2xl px-6 py-3 font-extrabold" onClick={handleBackToProducts}>
              חזרה
            </button>
          </div>
        </div>
      </div>
    );
  }

  const price = selectedOption ? optionFinalPrice(selectedOption) : null;
  const regular = selectedOption?.price ?? null;
  const hasSale =
    selectedOption && typeof selectedOption.salePrice === "number" && selectedOption.salePrice !== null;
  const canAdd = Boolean(selectedOption && selectedOption.inStock > 0);
  const addButtonText = !canAdd
    ? "אזל מהמלאי"
    : isAdding
      ? "מוסיף..."
      : addSuccess
        ? "נוסף לסל"
        : "הוספה לסל";

  return (
    <div className="lux-shell">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="lux-card rounded-3xl p-6 md:p-8 lux-appear">
          <button
            className="lux-button lux-button--ghost rounded-2xl px-4 py-2 text-sm font-extrabold"
            onClick={handleBackToProducts}
          >
            חזרה →
          </button>

          <div className="mt-6 grid gap-8 md:grid-cols-2">
            {/* Image */}
            {/* Image */}
<div className="overflow-hidden rounded-3xl border border-(--lux-border) bg-black/35">
  <div className="relative aspect-square w-full">
    <img
      src={selectedOption?.image?.url || product.options?.[0]?.image?.url || "/placeholder.png"}
      alt={product.title}
      className="absolute inset-0 h-full w-full object-cover object-center"
    />
    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-black/10" />
  </div>
</div>

            {/* Info */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <h1 className="lux-heading text-2xl md:text-3xl text-white">{product.title}</h1>
                {product.top ? (
                  <span className="rounded-full border border-(--lux-border) bg-black/60 px-3 py-1 text-xs font-extrabold text-(--lux-gold-soft)">
                    מוביל
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm text-white/70 whitespace-pre-line">
                {product.description || ""}
              </p>

              <div className="mt-6 lux-line" />

              {/* Options */}
              <div className="mt-6">
                <div className="text-xs font-extrabold text-white/70">בחירת אפשרות</div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {product.options.map((o) => {
                    const oPrice = optionFinalPrice(o);
                    const active = o._id === selectedOptionId;
                    return (
                      <button
                        key={o._id}
                        type="button"
                        onClick={() => setSelectedOptionId(o._id)}
                        className={[
                          "w-full rounded-2xl border px-4 py-3 text-right transition",
                          active
                            ? "border-(--lux-gold-soft) bg-[rgba(205,165,59,0.16)]"
                            : "border-(--lux-border) bg-black/25 hover:bg-black/35",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-extrabold text-white">{o.name}</div>
                            <div className="mt-1 text-xs text-white/60">
                              מלאי:{" "}
                              <span className={o.inStock > 0 ? "text-white/80" : "text-red-300"}>
                                {o.inStock}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-(--lux-gold-soft)">
                              ₪{oPrice.toFixed(0)}
                            </div>
                            {typeof o.salePrice === "number" && o.salePrice !== null ? (
                              <div className="text-xs text-white/45 line-through">₪{o.price.toFixed(0)}</div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price + actions */}
              <div className="mt-7 flex items-end justify-between gap-4">
                <div>
                  <div className="text-xs text-white/60">מחיר</div>
                  <div className="text-2xl font-extrabold text-(--lux-gold-soft)">
                    {price !== null ? `₪${price.toFixed(0)}` : "—"}
                  </div>
                  {hasSale && regular !== null ? (
                    <div className="text-sm text-white/45 line-through">₪{regular.toFixed(0)}</div>
                  ) : null}
                </div>

                <button
                  className="lux-button rounded-2xl px-6 py-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => {
                    void handleAddToCart();
                  }}
                  disabled={!canAdd || isAdding}
                >
                  {addButtonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={[
            "fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
            feedback.kind === "success"
              ? "border-emerald-300/35 bg-emerald-950/85 text-emerald-100"
              : "border-rose-300/35 bg-rose-950/85 text-rose-100",
          ].join(" ")}
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
