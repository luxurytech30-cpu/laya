"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

type FormData = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

type SubmitStatus = "idle" | "success" | "error";

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

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

const quickHighlights = ["מענה מהיר", "ייעוץ אישי", "שירות פרימיום"];

const inputBaseClass =
  "mt-2 w-full rounded-xl border border-(--lux-border) bg-black/28 px-4 py-3 text-white outline-none placeholder:text-white/35 transition focus:border-(--lux-gold-soft) focus:bg-black/35 focus:shadow-[0_0_0_1px_rgba(242,214,138,0.35),0_12px_28px_rgba(0,0,0,0.32)]";

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage("");
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "שליחת ההודעה נכשלה.");
      }

      setSubmitStatus("success");
      setStatusMessage(data?.message || "ההודעה נשלחה בהצלחה! נחזור אליכם בהקדם.");
      setFormData(initialFormData);
    } catch (error) {
      console.error("[contact-us] submit failed", error);
      setSubmitStatus("error");
      setStatusMessage("שליחת ההודעה נכשלה. נסו שוב בעוד רגע.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="lux-shell py-10" dir="rtl" lang="he">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 sm:px-8">
        <section className="lux-card lux-premium-sheen lux-appear relative overflow-hidden rounded-3xl p-6 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-75 mix-blend-screen"
            style={{
              background:
                "radial-gradient(circle at 16% 26%, rgba(242,214,138,0.24), transparent 40%), radial-gradient(circle at 86% 80%, rgba(205,165,59,0.14), transparent 44%)",
            }}
          />

          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <p className="lux-appear delay-1 inline-flex rounded-full border border-(--lux-border) bg-black/35 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-(--lux-gold-soft)">
                צור קשר
              </p>
              <h1 className="lux-heading lux-appear delay-2 text-4xl font-black leading-[1.08] text-white sm:text-5xl lg:text-6xl">
                בואו נבנה לכם
                <span className="lux-gradient-gold block">חוויה בלתי נשכחת</span>
              </h1>
              <p className="lux-appear delay-3 max-w-xl text-base leading-relaxed text-white/74 sm:text-lg">
                יש לכם שאלה, רעיון, או צורך בהכוונה? צוות Laya Luxe  זמין לתת מענה מדויק ואישי ברמת שירות
                פרימיום.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {quickHighlights.map((item, index) => (
                  <span
                    key={item}
                    className="lux-appear rounded-full border border-(--lux-border) bg-black/30 px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-white/80"
                    style={{ animationDelay: `${0.5 + index * 0.08}s` }}
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {socials.map((social, index) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="lux-appear lux-glow-hover inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--lux-border) bg-black/30 text-(--lux-gold-soft)"
                    style={{ animationDelay: `${0.72 + index * 0.1}s` }}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="lux-card-raise lux-appear delay-4 relative overflow-hidden rounded-3xl border border-(--lux-border) bg-black/35 p-6 sm:p-7">
              <h2 className="lux-heading text-2xl text-white sm:text-3xl">פרטי יצירת קשר</h2>

              <div className="mt-5 space-y-4">
                <article className="lux-appear delay-1 rounded-2xl border border-(--lux-border) bg-black/30 p-4">
                  <p className="text-xs font-bold tracking-[0.16em] text-(--lux-gold-soft)">טלפון</p>
                  <a href="tel:050-123-4567"  className="mt-2 block text-lg font-bold text-white transition hover:text-(--lux-gold-soft)">
                    050-735-0731
                  </a>
                </article>

                <article className="lux-appear delay-2 rounded-2xl border border-(--lux-border) bg-black/30 p-4">
                  <p className="text-xs font-bold tracking-[0.16em] text-(--lux-gold-soft)">דוא״ל</p>
                  <a
                    href="mailto:info@lord.co.il"
                    
                    className="mt-2 block text-base font-bold text-white transition hover:text-(--lux-gold-soft)"
                  >
                    info@lord.co.il
                  </a>
                </article>

                <article className="lux-appear delay-3 rounded-2xl border border-(--lux-border) bg-black/30 p-4">
                  <p className="text-xs font-bold tracking-[0.16em] text-(--lux-gold-soft)">שעות פעילות</p>
                  <p className="mt-2 text-sm text-white/80"> 09:00-23:59</p>
                  
                </article>
                <article className="lux-appear delay-3 rounded-2xl border border-(--lux-border) bg-black/30 p-4">
                  <p className="text-xs font-bold tracking-[0.16em] text-(--lux-gold-soft)">כתובת</p>
                  <p className="mt-2 text-sm text-white/80"> עראבה, כביש ראשי</p>
                  
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <article className="lux-card lux-card-raise lux-appear delay-1 rounded-3xl p-6 md:p-8">
            <h2 className="lux-heading lux-appear delay-2 text-3xl text-white">שלחו לנו הודעה</h2>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="lux-appear delay-2">
                <label htmlFor="name" className="block text-sm font-semibold text-white/80">
                  שם מלא *
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="כתבו את שמכם המלא"
                  required
                  className={inputBaseClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="lux-appear delay-3">
                  <label htmlFor="email" className="block text-sm font-semibold text-white/80">
                    דוא״ל *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                    
                    className={inputBaseClass}
                  />
                </div>

                <div className="lux-appear delay-3">
                  <label htmlFor="phone" className="block text-sm font-semibold text-white/80">
                    טלפון
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="050-1234567"
                    
                    className={`${inputBaseClass} text-right`}
                  />
                </div>
              </div>

              <div className="lux-appear delay-4">
                <label htmlFor="subject" className="block text-sm font-semibold text-white/80">
                  נושא *
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="איך נוכל לעזור?"
                  required
                  className={inputBaseClass}
                />
              </div>

              <div className="lux-appear delay-4">
                <label htmlFor="message" className="block text-sm font-semibold text-white/80">
                  הודעה *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="כתבו את פרטי ההודעה..."
                  rows={6}
                  required
                  className={`${inputBaseClass} resize-none`}
                />
              </div>

              {statusMessage ? (
                <p
                  className={`lux-appear rounded-xl border px-4 py-3 text-sm ${
                    submitStatus === "error"
                      ? "border-red-300/35 bg-red-950/20 text-red-200"
                      : "border-(--lux-border) bg-black/25 text-(--lux-gold-soft)"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="lux-appear delay-4 lux-button lux-glow-hover w-full rounded-xl px-5 py-3 text-sm font-extrabold disabled:opacity-65"
              >
                {isSubmitting ? "שולח..." : "שליחת ההודעה"}
              </button>
            </form>
          </article>

          <div className="space-y-6">
            <article className="lux-card lux-card-raise lux-appear delay-2 rounded-3xl p-6 md:p-8">
              <h3 className="lux-heading lux-appear delay-3 text-2xl text-white">צריכים ייעוץ מהיר?</h3>
              <p className="mt-4 text-sm leading-relaxed text-white/75">
                הצוות שלנו זמין לעזור ללא עלות בבחירת הפריט המדויק עבורכם. ספרו לנו מה אתם מחפשים ונחזור אליכם עם
                המלצה ממוקדת.
              </p>
              <a
                href="tel:0507350731"
                className="lux-button lux-glow-hover mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-extrabold"
              >
                התקשרו עכשיו: <span className="ms-2" dir="ltr">050-735-0731</span>
              </a>
            </article>

            <article className="lux-card lux-card-raise lux-appear delay-3 rounded-3xl p-6">
              <h3 className="lux-heading lux-appear delay-4 text-xl text-white">למה לעבוד איתנו</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/75">
                {[
                  "התאמה אישית מלאה לצרכים ולסגנון שלכם",
                  "זמינות גבוהה ומענה מהיר לאורך כל התהליך",
                  "בחירה מוקפדת במוצרים ברמת פרימיום אמיתית",
                ].map((reason, index) => (
                  <li
                    key={reason}
                    className="lux-appear flex items-start gap-2"
                    style={{ animationDelay: `${0.58 + index * 0.09}s` }}
                  >
                    <span className="mt-1 h-2 w-2 rounded-full bg-(--lux-gold)" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
