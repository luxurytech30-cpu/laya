type TrustItem = {
  title: string;
  description: string;
  icon: string;
};

type TrustSectionProps = {
  items: TrustItem[];
};

export default function TrustSection({ items }: TrustSectionProps) {
  return (
    <section className="lux-appear delay-3">
      <div className="mb-5">
        <p className="text-xs font-bold tracking-[0.22em] text-(--lux-gold-soft)">למה לקנות אצלנו</p>
        <h2 className="lux-heading mt-2 text-3xl text-white">אמון וביטחון</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article key={item.title} className="lux-card rounded-2xl p-5">
            <span className="text-2xl text-(--lux-gold-soft)">{item.icon}</span>
            <h3 className="lux-heading mt-3 text-xl text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
