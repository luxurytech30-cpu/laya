import Link from "next/link";

export type HomeProduct = {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  salePrice?: number | null;
};

type ProductCardProps = {
  product: HomeProduct;
};

function displayPrice(product: HomeProduct) {
  const hasSale = typeof product.salePrice === "number";
  return hasSale ? product.salePrice ?? product.price : product.price;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasSale = typeof product.salePrice === "number";
  const finalPrice = displayPrice(product);

  return (
    <article className="group lux-card overflow-hidden rounded-3xl p-4 transition duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden rounded-2xl border border-(--lux-border) bg-black/40">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="h-56 w-full object-cover object-center transition duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="mt-4">
        <h3 className="lux-heading text-xl text-white">{product.title}</h3>

        <div className="mt-3 flex items-end gap-2">
          <span className="text-lg font-extrabold text-(--lux-gold-soft)">₪{finalPrice.toFixed(0)}</span>
          {hasSale ? <span className="text-xs text-white/45 line-through">₪{product.price.toFixed(0)}</span> : null}
        </div>

        <Link
          href={`/products/${product.id}`}
          className="lux-button mt-4 inline-flex w-full justify-center rounded-2xl py-2.5 text-xs font-extrabold"
        >
          צפייה במוצר
        </Link>
      </div>
    </article>
  );
}
