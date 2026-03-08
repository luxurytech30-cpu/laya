type ValueItem = {
  icon: string;
  title: string;
  description: string;
};

const values: ValueItem[] = [
  {
    icon: "💎",
    title: "איכות ללא פשרות",
    description: "אנו בוחרים רק את המוצרים האיכותיים ביותר מהמותגים המובילים בעולם.",
  },
  {
    icon: "🤝",
    title: "שירות אישי",
    description: "צוות המומחים שלנו מלווה אתכם בכל שלב, מהבחירה ועד לאחר הרכישה.",
  },
  {
    icon: "✨",
    title: "חוויה ייחודית",
    description: "קניית מוצר יוקרה צריכה להרגיש מדויקת, אישית ובלתי נשכחת.",
  },
  {
    icon: "🌍",
    title: "מותגים בינלאומיים",
    description: "שיתופי פעולה עם המותגים הנחשקים ביותר מכל רחבי העולם.",
  },
];

export default function AboutUsPage() {
  return (
    <div className="lux-shell" dir="rtl" lang="he">
      <section className="lux-premium-sheen relative w-full overflow-hidden border-b border-(--lux-border)">
        <div className="absolute inset-0">
          <img
            src="/about.avif"
            alt="רקע יוקרתי"
            className="lux-soft-pan h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/65" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[52vh] w-full max-w-7xl items-center px-4 py-18 sm:px-8">
          <div className="lux-appear max-w-2xl">
            <p className="mb-4 inline-flex rounded-full border border-(--lux-border) bg-black/40 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-(--lux-gold-soft)">
              אודות המותג
            </p>
            <h1 className="lux-heading lux-gradient-gold text-4xl font-black leading-[1.08] sm:text-5xl md:text-6xl">
              הסיפור שלנו
            </h1>
            <p className="mt-5 text-lg text-white/75">
              מסורת של מצוינות בעולם היוקרה, עם תשוקה אמיתית לפרטים הקטנים ולשירות ברמה הגבוהה ביותר.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-8 md:py-18">
        <div className="lux-card lux-card-raise lux-appear delay-1 rounded-3xl p-7 sm:p-10">
          <h2 className="lux-heading text-3xl text-white sm:text-4xl">מי אנחנו</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-white/78 sm:text-lg">
            <p>
              Laya Luxe  נוסדה מתוך אהבה עמוקה לעולם היוקרה, האופנה והעיצוב. אנו מאמינים שכל אדם ראוי ליהנות
              מפריטים יוצאי דופן, עם איכות בלתי מתפשרת ונוכחות ייחודית.
            </p>
            <p>
              עם ניסיון של יותר מ־15 שנה בתעשייה, אנו מאתרים עבורכם קולקציות נבחרות של שעונים, תכשיטים, תיקים ובשמים
              מהמותגים המובילים בעולם, ומעניקים ליווי אישי לכל אורך הדרך.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-(--lux-border) bg-black/25 py-14 md:py-18">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="mb-10 text-center">
            <h2 className="lux-heading lux-appear delay-2 text-3xl font-black text-white sm:text-4xl">
              הערכים שלנו
            </h2>
            <div className="lux-line mx-auto mt-4 max-w-xs" />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {values.map((item, index) => (
              <article
                key={item.title}
                className="lux-card lux-card-raise lux-appear rounded-3xl p-6 text-center"
                style={{ animationDelay: `${0.15 + index * 0.1}s` }}
              >
                <span className="inline-block text-4xl transition-transform duration-500 hover:scale-110">
                  {item.icon}
                </span>
                <h3 className="lux-heading mt-4 text-2xl text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
