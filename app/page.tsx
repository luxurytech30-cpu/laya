import BrandSection from "@/components/home/BrandSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Hero from "@/components/home/Hero";
import { type HomeProduct } from "@/components/home/ProductCard";
import TrustSection from "@/components/home/TrustSection";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";

const heroImage = "logo.jpg";
const brandImage =
  "brand.avif";

const trustItems = [
  {
    title: "תשלום מאובטח",
    description: "סליקה מוצפנת עם ספקי תשלום אמינים.",
    icon: "בטוח",
  },
  {
    title: "משלוח מהיר",
    description: "שילוח אקספרס עם מעקב חי עד הדלת.",
    icon: "מהיר",
  },
  {
    title: "איכות פרימיום",
    description: "כל פריט עובר אימות ובדיקת איכות לפני משלוח.",
    icon: "איכות",
  },
  {
    title: "שירות לקוחות",
    description: "ליווי אישי לפני ואחרי כל רכישה.",
    icon: "שירות",
  },
];

type LeanOption = {
  _id: unknown;
  image?: { url?: string };
  price: number;
  salePrice?: number | null;
};

type LeanProduct = {
  _id: unknown;
  title: string;
  defaultOptionId?: unknown;
  options: LeanOption[];
};

function idToString(id: unknown) {
  if (typeof id === "string") return id;
  if (typeof id === "object" && id !== null && "toString" in id) {
    return String(id.toString());
  }
  return "";
}

function optionFinalPrice(option: LeanOption) {
  const sale = typeof option.salePrice === "number" ? option.salePrice : null;
  return sale !== null && sale >= 0 ? sale : option.price;
}

function getDefaultOption(product: LeanProduct) {
  const defaultId = idToString(product.defaultOptionId);
  if (defaultId) {
    const found = product.options.find((opt) => idToString(opt._id) === defaultId);
    if (found) return found;
  }

  return (
    product.options.slice().sort((a, b) => optionFinalPrice(a) - optionFinalPrice(b))[0] || null
  );
}

async function getTopProducts(): Promise<HomeProduct[]> {
  try {
    await dbConnect();

    const raw = (await Product.find({ top: true })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(8)
      .lean()) as unknown;

    const products = Array.isArray(raw) ? (raw as LeanProduct[]) : [];

    return products.reduce<HomeProduct[]>((acc, product) => {
      const option = getDefaultOption(product);
      if (!option) return acc;

      const id = idToString(product._id);
      if (!id) return acc;

      acc.push({
        id,
        title: product.title,
        imageUrl: option.image?.url || "/placeholder.png",
        price: option.price,
        salePrice: typeof option.salePrice === "number" ? option.salePrice : null,
      });

      return acc;
    }, []);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredProducts = await getTopProducts();

  return (
    <div className="lux-shell">
      <Hero
        headline="יוקרה שמספרת סיפור"
        subtitle="גלו את הקולקציה הבלעדית שלנו - שעונים, תיקים, בשמים ותכשיטים מהמותגים המובילים בעולם"
        ctaLabel="קנייה עכשיו"
        ctaHref="/products"
        imageUrl={heroImage}
      />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-8">
        <FeaturedProducts products={featuredProducts} />

        <BrandSection imageUrl={brandImage} />

        <TrustSection items={trustItems} />
      </div>
    </div>
  );
}
