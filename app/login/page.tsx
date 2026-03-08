"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken } from "@/lib/api";

type LoginResponse = {
  token: string;
  user: {
    username: string;
    role: "admin";
  };
  bootstrap: boolean;
};

type FormState = {
  username: string;
  password: string;
};

const initialState: FormState = {
  username: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/admin");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => null)) as LoginResponse | { error: string } | null;

      if (!res.ok) {
        throw new Error(json && "error" in json ? json.error : "התחברות נכשלה");
      }

      if (!json || !("token" in json)) {
        throw new Error("תשובה לא תקינה מהשרת");
      }

      setToken(json.token);
     router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה בלתי צפויה");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="lux-shell flex items-center px-4 py-8 sm:px-6 lg:px-10">
      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        
        <section className="lux-card lux-appear delay-2 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="glow-dot" />
            <p className="text-xs text-amber-100/80">כניסת מנהל</p>
          </div>

          <h2 className="lux-heading mt-4 text-3xl font-semibold text-amber-50">התחברות</h2>
          

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm text-amber-100/85">שם משתמש</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-500/30"
                placeholder="לדוגמה: lord-admin"
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-amber-100/85">סיסמה</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-amber-200/25 bg-black/40 px-4 py-3 text-amber-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-500/30"
                placeholder="הכנס סיסמה"
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-300/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="lux-button w-full rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "מתחבר..." : "כניסה למערכת"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
