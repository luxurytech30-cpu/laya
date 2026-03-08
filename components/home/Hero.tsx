import Link from "next/link";

type HeroProps = {
  headline: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
};

export default function Hero({ headline, subtitle, ctaLabel, ctaHref, imageUrl }: HeroProps) {
  return (
    <section className="lux-card lux-premium-sheen w-full overflow-hidden rounded-none px-4 py-8 sm:px-8 md:py-10 lg:px-12">
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <p className="lux-appear inline-flex rounded-full border border-(--lux-border) bg-black/35 px-4 py-1.5 text-xs font-bold tracking-[0.22em] text-(--lux-gold-soft)">
            קולקציית יוקרה בלעדית
          </p>

          <h1 className="lux-heading lux-appear delay-1 text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            {headline}
          </h1>

          <p className="lux-appear delay-2 max-w-xl text-base leading-relaxed text-white/74 sm:text-lg">
            {subtitle}
          </p>

          <div className="lux-appear delay-3 flex flex-wrap items-center gap-4">
            <Link href={ctaHref} className="lux-button lux-glow-hover rounded-2xl px-7 py-3 text-sm font-extrabold">
              {ctaLabel}
            </Link>
            <Link
              href="/contact-us"
              className="lux-glow-hover rounded-2xl border border-(--lux-border) bg-black/20 px-6 py-3 text-sm font-bold text-white/85"
            >
              צור קשר
            </Link>
          </div>
        </div>

        <div className="lux-card-raise relative overflow-hidden rounded-3xl border border-(--lux-border) bg-black/30">
          <img
            src={imageUrl}
            alt="תצוגת לייף סטייל יוקרתית"
            className="h-72 w-full object-cover object-center sm:h-110 lg:h-140"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
          <div
            className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen"
            style={{
              background:
                "radial-gradient(circle at 78% 24%, rgba(242,214,138,0.24), transparent 34%), radial-gradient(circle at 20% 74%, rgba(242,214,138,0.14), transparent 40%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
