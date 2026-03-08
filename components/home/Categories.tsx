import Link from "next/link";

export type CategoryItem = {
  title: string;
  description: string;
  imageUrl: string;
  href: string;
};

type CategoriesProps = {
  categories: CategoryItem[];
};

export default function Categories({ categories }: CategoriesProps) {
  return (
    <section className="lux-appear">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.22em] text-(--lux-gold-soft)">קנייה לפי קטגוריה</p>
          <h2 className="lux-heading mt-2 text-3xl text-white">קטגוריות מובילות</h2>
        </div>
        <Link href="/products" className="text-sm font-semibold text-white/75 transition hover:text-(--lux-gold-soft)">
          לכל המוצרים
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.title}
            href={category.href}
            className="group relative overflow-hidden rounded-3xl border border-(--lux-border) bg-black/30"
          >
            <img
              src={category.imageUrl}
              alt={category.title}
              className="h-56 w-full object-cover object-center transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute inset-x-4 bottom-4">
              <h3 className="lux-heading text-2xl text-white">{category.title}</h3>
              <p className="mt-1 text-sm text-white/75">{category.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
