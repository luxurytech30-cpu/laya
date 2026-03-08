import Link from "next/link";
import ProductCard, { type HomeProduct } from "@/components/home/ProductCard";

type FeaturedProductsProps = {
  products: HomeProduct[];
};

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="lux-appear delay-1">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.22em] text-(--lux-gold-soft)">TOP PRODUCTS</p>
          <h2 className="lux-heading mt-2 text-3xl text-white">המוצרים המובילים</h2>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={`${product.id}-${product.title}`} product={product} />
          ))}
        </div>
      ) : (
        <div className="lux-card rounded-2xl p-6 text-sm text-white/75">
          אין כרגע מוצרים מובילים להצגה.
        </div>
      )}

      <div className="mt-7 flex justify-center">
        <Link href="/products" className="lux-button rounded-2xl px-7 py-3 text-sm font-extrabold">
          לכל המוצרים
        </Link>
      </div>
    </section>
  );
}
