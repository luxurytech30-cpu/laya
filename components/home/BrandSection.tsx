type BrandSectionProps = {
  imageUrl: string;
};

export default function BrandSection({ imageUrl }: BrandSectionProps) {
  return (
    <section className="lux-appear delay-2">
      <div className="lux-card grid items-center gap-7 rounded-3xl p-6 md:grid-cols-2 md:p-8">
        <div className="relative overflow-hidden rounded-3xl border border-(--lux-border) bg-black/25">
          <img
            src={imageUrl}
            alt="תכשיטי המותג"
            className="h-60 w-full object-cover object-center sm:h-72 md:h-88"
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />
        </div>

        <div className="space-y-5">
          <p className="text-xs font-bold tracking-[0.22em] text-(--lux-gold-soft)">
            המותג
          </p>

          <h2 className="lux-heading text-4xl leading-tight text-white">
            עיצוב תכשיטים עם נוכחות
          </h2>

          <p className="text-sm leading-relaxed text-white/75 sm:text-base">
            Laya Luxe מציג קולקציות תכשיטים שנבחרו בקפידה, המשלבות עיצוב אלגנטי עם איכות
            בלתי מתפשרת. כל פריט נוצר מתוך תשומת לב לפרטים הקטנים, כדי להעניק מראה
            יוקרתי ונוכחות אמיתית.
          </p>

          <p className="text-sm leading-relaxed text-white/65 sm:text-base">
            משרשראות עדינות וצמידים ייחודיים ועד טבעות בעיצוב מודרני — הקטלוג שלנו
            נבנה מתוך בחירה מדויקת של פריטים שמדגישים סטייל, איכות וייחוד.
          </p>
        </div>
      </div>
    </section>
  );
}
