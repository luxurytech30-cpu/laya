"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/api";
import { setFlashFeedback } from "@/lib/flashFeedback";
import {
  getCartCount,
  getOrCreateGuestId,
  subscribeCartChange,
  syncCartFromServer,
} from "@/lib/cart";

type NavItem = {
  href: string;
  label: string;
};

const centerNavItems: NavItem[] = [
  { href: "/about-us", label: "אודות" },
  { href: "/contact-us", label: "צור קשר" },
  { href: "/products", label: "מוצרים" },
  { href: "/", label: "דף הבית" },
];

const adminNavItem: NavItem = { href: "/admin", label: "אדמין" };

function subscribeToken(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === "lt_token") callback();
  };
  const onTokenChange = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener("lt-token-change", onTokenChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("lt-token-change", onTokenChange);
  };
}

function getTokenSnapshot() {
  return getToken();
}

function getTokenServerSnapshot() {
  return null;
}

export default function MainNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getTokenServerSnapshot
  );
  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    getOrCreateGuestId();

    const syncCount = () => {
      setCartCount(getCartCount());
    };

    syncCount();
    void syncCartFromServer().then(syncCount);
    return subscribeCartChange(syncCount);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    setFlashFeedback({ kind: "success", message: "התנתקת בהצלחה" });
    clearToken();
    setIsMobileMenuOpen(false);
    router.replace("/login");
  }

  return (
    <div className="w-full">
      <nav
        className="lux-nav w-full max-w-none rounded-none border-x-0 border-t-0 px-3 py-3 sm:px-6"
        aria-label="ניווט ראשי"
        dir="ltr"
      >
        <div className="grid w-full grid-cols-[auto_1fr] items-center gap-2 md:grid-cols-[1fr_auto_1fr] md:gap-3">
          <div className="flex items-center gap-2 justify-self-start">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="lux-nav-link inline-flex items-center justify-center md:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-main-menu"
              aria-label={isMobileMenuOpen ? "סגירת תפריט" : "פתיחת תפריט"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-5 w-5 text-(--lux-gold-soft)"
              >
                {isMobileMenuOpen ? (
                  <path
                    d="M6 6l12 12M18 6l-12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </button>

            {token ? (
              <button
                type="button"
                onClick={handleLogout}
                className="lux-nav-link hidden shrink-0 items-center md:inline-flex"
              >
                התנתקות
              </button>
            ) : (
              <Link
                href="/login"
                className={`lux-nav-link hidden shrink-0 items-center md:inline-flex ${
                  isActive("/login") ? "lux-nav-link--active" : ""
                }`}
              >
                התחברות
              </Link>
            )}

            {token ? (
              <Link
                href={adminNavItem.href}
                className={`lux-nav-link hidden shrink-0 items-center md:inline-flex ${
                  isActive(adminNavItem.href) ? "lux-nav-link--active" : ""
                }`}
                style={{ animationDelay: "135ms" }}
              >
                {adminNavItem.label}
              </Link>
            ) : null}

            <Link
              href="/cart"
              aria-label="עגלה"
              className={`lux-nav-link inline-flex shrink-0 items-center justify-center ${
                isActive("/cart") ? "lux-nav-link--active" : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4 text-(--lux-gold-soft)"
              >
                <path
                  d="M3 5h2l1.3 8.1a2 2 0 0 0 2 1.7h8.3a2 2 0 0 0 2-1.5L20 8H7.2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="19" r="1.5" fill="currentColor" />
                <circle cx="17" cy="19" r="1.5" fill="currentColor" />
              </svg>
              <span className="sr-only">עגלה</span>
              {cartCount > 0 ? (
                <span className="rounded-full border border-(--lux-border) bg-black/45 px-2 py-0.5 text-[11px] font-extrabold text-(--lux-gold-soft)">
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </div>

          <div className="hidden items-center justify-center gap-2 md:flex">
            {centerNavItems.map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`lux-nav-link inline-flex shrink-0 items-center ${
                  isActive(item.href) ? "lux-nav-link--active" : ""
                }`}
                style={{ animationDelay: `${130 + idx * 65}ms` }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 justify-self-end rounded-xl border border-(--lux-border) bg-black/35 px-2 py-2 text-white/90 transition hover:bg-black/45 sm:gap-2 sm:px-3"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-(--lux-border) bg-black/40 sm:h-8 sm:w-8">
              <img
                src="/logo.jpg"
                alt="Lord Luxe"
                width={28}
                height={28}
                className="object-contain"
              />
            </span>
            <span className="whitespace-nowrap text-[11px] font-extrabold tracking-[0.04em] sm:text-sm sm:tracking-[0.08em]">
              Laya Luxe 
            </span>
          </Link>
        </div>

        {isMobileMenuOpen ? (
          <div id="mobile-main-menu" className="mt-3 grid gap-2 md:hidden">
            {centerNavItems.map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`lux-nav-link inline-flex items-center justify-center ${
                  isActive(item.href) ? "lux-nav-link--active" : ""
                }`}
                style={{ animationDelay: `${130 + idx * 65}ms` }}
              >
                {item.label}
              </Link>
            ))}

            {token ? (
              <button
                type="button"
                onClick={handleLogout}
                className="lux-nav-link inline-flex items-center justify-center"
              >
                התנתקות
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`lux-nav-link inline-flex items-center justify-center ${
                  isActive("/login") ? "lux-nav-link--active" : ""
                }`}
              >
                התחברות
              </Link>
            )}

            {token ? (
              <Link
                href={adminNavItem.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`lux-nav-link inline-flex items-center justify-center ${
                  isActive(adminNavItem.href) ? "lux-nav-link--active" : ""
                }`}
              >
                {adminNavItem.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
