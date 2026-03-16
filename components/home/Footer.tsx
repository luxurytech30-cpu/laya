import Image from "next/image";
import Link from "next/link";

type FooterProps = {
  year: number;
};

const navLinks = [
  { href: "/", label: "דף הבית" },
  { href: "/products", label: "מוצרים" },
  { href: "/about-us", label: "אודות" },
  { href: "/contact-us", label: "צור קשר" },
];

const socials = [
  {
    href: "https://www.instagram.com/lord_luxe_online?igsh=MXh1M25kaXptcG01ZQ==",
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "https://www.facebook.com/share/1CdUvQTzVT/?mibextid=wwXIfr",
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
        <path
          d="M14 8h2.3V5.5h-2.7c-3 0-4.6 1.8-4.6 4.9V12H7v2.7h2V20h2.8v-5.3h2.4L14.8 12h-3V10.7c0-1.1.4-1.7 1.2-1.7Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function Footer({ year }: FooterProps) {
  return (
    <footer className="lux-card lux-premium-sheen w-full rounded-none px-4 py-6 sm:px-8 md:py-8 lg:px-12">
      <div className="relative z-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4 xl:items-center">
       <div className="flex items-center gap-3">
<div className="lux-float-slow h-9 w-9 overflow-hidden rounded-lg border border-(--lux-border)">
  <img
    src="/logo.jpg"
    alt="Lord Luxe Logo"
    className="h-full w-full object-cover"
  />
</div>

  <p className="lux-heading lux-gradient-gold text-2xl">
    Laya Luxe 
  </p>
</div>

        <div className="lux-appear delay-1 flex flex-wrap gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="lux-glow-hover rounded-xl border border-(--lux-border) bg-black/25 px-4 py-2 text-xs font-bold tracking-[0.08em] text-white/80"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="lux-appear delay-2 space-y-2 text-sm text-white/80">
          <p className="text-xs font-bold tracking-[0.2em] text-(--lux-gold-soft)">צור קשר</p>
          <a href="tel:+972507350731" className="block transition hover:text-(--lux-gold-soft)">
            050-735-0731
          </a>
          <a href="mailto:info@lord.co.il" className="block transition hover:text-(--lux-gold-soft)">
            info@lord.co.il
          </a>
        </div>

        <div className="lux-appear delay-3 flex gap-2">
          {socials.map((social) => (
            <Link
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="lux-glow-hover inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--lux-border) bg-black/35 text-xs font-extrabold text-(--lux-gold-soft)"
            >
              {social.icon}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 lux-line" />
      <p className="mt-4 text-center text-xs text-white/55">© {year} Laya Luxe. כל הזכויות שמורות.</p>
    </footer>
  );
}
