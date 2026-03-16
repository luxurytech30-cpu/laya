export type FlashFeedbackKind = "success" | "error";

export type FlashFeedback = {
  kind: FlashFeedbackKind;
  message: string;
};

const FLASH_FEEDBACK_KEY = "lt_flash_feedback_v1";

function inBrowser() {
  return typeof window !== "undefined";
}

export function setFlashFeedback(feedback: FlashFeedback) {
  if (!inBrowser()) return;
  sessionStorage.setItem(FLASH_FEEDBACK_KEY, JSON.stringify(feedback));
}

export function consumeFlashFeedback(): FlashFeedback | null {
  if (!inBrowser()) return null;

  const raw = sessionStorage.getItem(FLASH_FEEDBACK_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(FLASH_FEEDBACK_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<FlashFeedback> | null;
    if (!parsed || typeof parsed.message !== "string") return null;
    if (parsed.kind !== "success" && parsed.kind !== "error") return null;
    return { kind: parsed.kind, message: parsed.message };
  } catch {
    return null;
  }
}
