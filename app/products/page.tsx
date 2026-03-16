"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  createdAt: string;
  updatedAt: string;
};

type Category = {
  _id: string;
  name: string;
  image?: { url?: string; publicId?: string } | null;
};

type SortValue = "new" | "price_asc" | "price_desc" | "title";
type FeedbackState = { kind: "success" | "error"; message: string } | null;

function normalizeSort(raw: string | null): SortValue {
  if (raw === "price_asc" || raw === "price_desc" || raw === "title" || raw === "new") {
    return raw;
  }
  return "new";
}

function optionFinalPrice(opt: ProductOption) {
  const sale = typeof opt.salePrice === "number" ? opt.salePrice : null;
  return sale !== null && sale >= 0 ? sale : opt.price;
}

function getDefaultOption(product: Product) {
  if (product.defaultOptionId) {
    const found = product.options.find((option) => option._id === product.defaultOptionId);
    if (found) return found;
  }
  return (
    product.options
      .slice()
      .sort((a, b) => optionFinalPrice(a) - optionFinalPrice(b))[0] || null
  );
}

function categoryDisplayImage(category: Category, products: Product[]) {
  const categoryImage = String(category.image?.url ?? "").trim();
  if (categoryImage) return categoryImage;

  const first = products[0];
  const firstOption = first ? getDefaultOption(first) : null;
  return firstOption?.image?.url || "/placeholder.png";
}

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [addingKey, setAddingKey] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("categoryId") ?? "");
  const [topOnly, setTopOnly] = useState(() => searchParams.get("top") === "1");
  const [sort, setSort] = useState<SortValue>(() => normalizeSort(searchParams.get("sort")));

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

  const uiParams = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (topOnly) params.set("top", "1");
    if (sort !== "new") params.set("sort", sort);
    return params;
  }, [q, categoryId, topOnly, sort]);

  const detailQuery = useMemo(() => {
    const query = uiParams.toString();
    return query ? `?${query}` : "";
  }, [uiParams]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams(uiParams.toString());
      params.set("sort", sort === "price_asc" || sort === "price_desc" ? "new" : sort);

      const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data?.ok) {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      } else {
        setProducts([]);
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId, topOnly, sort]);

  useEffect(() => {
    const query = uiParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, uiParams]);

  const viewProducts = useMemo(() => {
    const list = [...products];

    if (sort === "price_asc") {
      list.sort((a, b) => {
        const ao = getDefaultOption(a);
        const bo = getDefaultOption(b);
        return (ao ? optionFinalPrice(ao) : 0) - (bo ? optionFinalPrice(bo) : 0);
      });
    }

    if (sort === "price_desc") {
      list.sort((a, b) => {
        const ao = getDefaultOption(a);
        const bo = getDefaultOption(b);
        return (bo ? optionFinalPrice(bo) : 0) - (ao ? optionFinalPrice(ao) : 0);
      });
    }

    return list;
  }, [products, sort]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of viewProducts) {
      const key = product.categoryId || "__uncategorized";
      const current = groups.get(key);
      if (current) {
        current.push(product);
      } else {
        groups.set(key, [product]);
      }
    }

    const categoryIdsFromApi = categories.map((category) => category._id);
    const categoryIdsSet = new Set(categoryIdsFromApi);
    const groupKeys = Array.from(groups.keys());

    const orderedKeys = categoryId
      ? groupKeys.filter((key) => key === categoryId)
      : [
          ...categoryIdsFromApi.filter((key) => groups.has(key)),
          ...groupKeys.filter((key) => !categoryIdsSet.has(key)),
        ];

    return orderedKeys
      .map((key) => {
        const category =
          categories.find((item) => item._id === key) ||
          ({
            _id: key,
            name: "ללא קטגוריה",
            image: null,
          } as Category);

        return {
          key,
          category,
          products: groups.get(key) || [],
        };
      })
      .filter((group) => group.products.length > 0);
  }, [viewProducts, categories, categoryId]);

  const activeBackgroundImage = useMemo(() => {
    if (!groupedProducts.length) return "";
    const selectedGroup =
      (categoryId ? groupedProducts.find((group) => group.key === categoryId) : null) || groupedProducts[0];
    return categoryDisplayImage(selectedGroup.category, selectedGroup.products);
  }, [groupedProducts, categoryId]);

  function handleQuickAdd(
    event: React.MouseEvent<HTMLButtonElement>,
    product: Product,
    option: ProductOption | null
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!option || option.inStock <= 0) {
      showFeedback("error", "אזל מהמלאי");
      return;
    }

    const existingQty =
      getCartItems().find((item) => item.productId === product._id && item.optionId === option._id)?.qty ?? 0;

    if (existingQty >= option.inStock) {
      showFeedback("error", "לא ניתן להוסיף מעבר למלאי הזמין");
      return;
    }

    const key = `${product._id}:${option._id}`;
    if (addingKey === key) return;
    setAddingKey(key);

    void addToCart({
      productId: product._id,
      optionId: option._id,
      qty: 1,
      title: product.title,
      optionName: option.name,
      imageUrl: option.image?.url || "/placeholder.png",
      unitPrice: optionFinalPrice(option),
    })
      .then((updatedItems) => {
        const updatedQty =
          updatedItems.find((item) => item.productId === product._id && item.optionId === option._id)?.qty ?? 0;
        if (updatedQty <= existingQty) {
          showFeedback("error", "לא ניתן להוסיף מעבר למלאי הזמין");
          return;
        }

        showFeedback("success", "המוצר נוסף לסל");
      })
      .catch(() => {
        showFeedback("error", "לא הצלחנו להוסיף לסל. נסו שוב.");
      })
      .finally(() => {
        setAddingKey((current) => (current === key ? "" : current));
      });
  }

  function renderProductCard(product: Product) {
    const option = getDefaultOption(product);
    const price = option ? optionFinalPrice(option) : null;
    const regular = option?.price ?? null;
    const hasSale = option && typeof option.salePrice === "number" && option.salePrice !== null;
    const currentKey = option ? `${product._id}:${option._id}` : "";

    return (
      <Link key={product._id} href={`/products/${product._id}${detailQuery}`} className="block">
        <div className="lux-card rounded-3xl p-5 lux-appear transition-transform duration-200 hover:-translate-y-1 cursor-pointer">
          <div className="relative overflow-hidden rounded-2xl border border-(--lux-border) bg-black/35">
            <div className="relative aspect-4/3 w-full bg-black/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option?.image?.url || "/placeholder.png"}
                alt={product.title}
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/10" />
            </div>

            {product.top ? (
              <div className="absolute left-3 top-3 rounded-full border border-(--lux-border) bg-black/60 px-3 py-1 text-[11px] font-extrabold text-(--lux-gold-soft)">
                מוביל
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0 text-right">
              <h3 className="lux-heading text-xl leading-snug text-white md:text-2xl">{product.title}</h3>
            </div>

            <div className="shrink-0 text-left">
              {price !== null ? (
                <>
                  <div className="text-2xl font-extrabold tracking-[0.06em] text-(--lux-gold-soft)">
                    ₪{price.toFixed(0)}
                  </div>
                  {hasSale && regular !== null ? (
                    <div className="mt-1 text-sm text-white/40 line-through">₪{regular.toFixed(0)}</div>
                  ) : null}
                </>
              ) : (
                <div className="text-sm text-white/60">—</div>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button className="lux-button w-full rounded-2xl py-3 text-sm font-extrabold">צפייה</button>
            <button
              type="button"
              onClick={(event) => handleQuickAdd(event, product, option)}
              disabled={!option || option.inStock <= 0 || addingKey === currentKey}
              className="lux-button lux-button--ghost w-full rounded-2xl py-3 text-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!option || option.inStock <= 0
                ? "אזל מהמלאי"
                : addingKey === currentKey
                ? "מוסיף..."
                : "הוסף לסל"}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div
      className="lux-shell relative overflow-hidden"
      style={
        activeBackgroundImage
          ? {
              backgroundImage: `linear-gradient(160deg, rgba(0,0,0,0.20), rgba(0,0,0,0.4)), url("${activeBackgroundImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(205,165,59,0.2),transparent_36%),radial-gradient(circle_at_85%_10%,rgba(205,165,59,0.13),transparent_30%)]" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        <div className="lux-card rounded-3xl p-6 md:p-8 lux-appear">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="glow-dot" />
                <h1 className="lux-heading text-2xl md:text-3xl text-(--lux-gold-soft)">מוצרים</h1>
              </div>
            </div>

            <div className="text-sm text-white/70">{loading ? "טוען..." : `${viewProducts.length} מוצרים`}</div>
          </div>

          <div className="mt-6 lux-line" />

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label className="text-xs font-semibold text-white/70">חיפוש</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-(--lux-border) bg-black/30 px-4 py-3">
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="חפש לפי כותרת / תיאור / אופציה..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
                {q ? (
                  <button
                    onClick={() => setQ("")}
                    className="rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:text-white"
                    type="button"
                  >
                    נקה
                  </button>
                ) : null}
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-white/70">קטגוריה</label>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-(--lux-border) bg-black/30 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="">כל הקטגוריות</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-white/70">מיון</label>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
                className="mt-2 w-full rounded-2xl border border-(--lux-border) bg-black/30 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="new">החדש ביותר</option>
                <option value="title">כותרת</option>
                <option value="price_asc">מחיר: נמוך לגבוה</option>
                <option value="price_desc">מחיר: גבוה לנמוך</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-white/70">מוצרים מובילים</label>
              <button
                type="button"
                onClick={() => setTopOnly((value) => !value)}
                className={[
                  "mt-2 w-full rounded-2xl px-4 py-3 text-sm font-bold",
                  topOnly ? "lux-button" : "lux-button lux-button--ghost",
                ].join(" ")}
              >
                {topOnly ? "מובילים בלבד ✓" : "כל המוצרים"}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="lux-card rounded-3xl p-5 animate-pulse">
                <div className="h-44 rounded-2xl bg-white/5" />
                <div className="mt-4 h-4 w-3/4 rounded bg-white/5" />
                <div className="mt-2 h-4 w-1/2 rounded bg-white/5" />
                <div className="mt-5 h-10 rounded-2xl bg-white/5" />
              </div>
            ))}
          </div>
        ) : viewProducts.length === 0 ? (
          <div className="mt-8 lux-card rounded-3xl p-8 lux-appear">
            <h2 className="lux-heading text-xl text-(--lux-gold-soft)">לא נמצאו מוצרים</h2>
            <p className="mt-2 text-sm text-white/70">נסה לשנות את החיפוש או הסינון.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {groupedProducts.map((group) => (
              <section key={`group:${group.key}`} className="space-y-4">
                <div className="rounded-3xl border border-(--lux-border) bg-black/48 p-5 md:p-6">
                  <p className="text-xs tracking-[0.2em] text-amber-100/80">קטגוריה</p>
                  <h2 className="lux-heading mt-2 text-2xl font-bold text-amber-50 md:text-3xl">{group.category.name}</h2>
                  <p className="mt-1 text-sm text-amber-100/80">{group.products.length} מוצרים בקטגוריה</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((product) => renderProductCard(product))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={[
            "fixed top-4 right-4 left-4 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl sm:left-auto sm:w-104",
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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="lux-shell">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="lux-card rounded-3xl p-6 md:p-8">
              <p className="text-sm text-white/70">טוען...</p>
            </div>
          </div>
        </div>
      }
    >
      <ProductsPageInner />
    </Suspense>
  );
}

