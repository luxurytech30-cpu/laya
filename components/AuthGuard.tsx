"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken } from "@/lib/api";

function subscribeToken(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = () => callback();
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

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useSyncExternalStore(subscribeToken, getTokenSnapshot, getTokenServerSnapshot);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [pathname, router, token]);

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center px-4 text-sm text-amber-100/80">
        בודקים הרשאת התחברות...
      </div>
    );
  }

  return <>{children}</>;
}
