"use client";

import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const nav = [
  { href: "/admin", label: "דשבורד" },
  { href: "/admin/products", label: "מוצרים" },
  { href: "/admin/orders", label: "\u05d4\u05d6\u05de\u05e0\u05d5\u05ea" },
  { href: "/admin/categories", label: "קטגוריות" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <div className="lux-shell px-4 py-6 sm:px-8 lg:px-12">
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="lux-card rounded-3xl p-5">
            <p className="text-xs tracking-[0.35em] text-amber-100/75">LAYA ADMIN</p>
            <h2 className="lux-heading mt-3 text-xl font-bold text-amber-50">ניהול מערכת</h2>

            <nav className="mt-6 space-y-2">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "block rounded-xl px-4 py-3 text-sm transition",
                      active
                        ? "border border-amber-200/35 bg-black/45 text-amber-50"
                        : "border border-amber-200/15 bg-black/25 text-amber-100/80 hover:bg-black/35",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={logout}
              className="lux-button lux-button--ghost mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold"
            >
              התנתקות
            </button>
          </aside>

          <main className="lux-card rounded-3xl p-6 sm:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
