import { NextResponse } from "next/server";

type ContactPayload = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
};

const GREEN_API_URL = process.env.GREEN_API_URL || "https://api.green-api.com";
const GREEN_ID_INSTANCE = process.env.GREEN_ID_INSTANCE;
const GREEN_API_TOKEN_INSTANCE = process.env.GREEN_API_TOKEN_INSTANCE;
const GREEN_ADMIN_CHAT_ID = process.env.GREEN_ADMIN_CHAT_ID;

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function phoneToChatId(phone: string) {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0") && digits.length === 10) {
    digits = `972${digits.slice(1)}`;
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) return null;
  return `${digits}@c.us`;
}

async function sendWhatsAppMessage(chatId: string, message: string) {
  if (!GREEN_ID_INSTANCE || !GREEN_API_TOKEN_INSTANCE) {
    throw new Error("חסרים פרטי זיהוי של Green API.");
  }

  const url = `${GREEN_API_URL}/waInstance${GREEN_ID_INSTANCE}/sendMessage/${GREEN_API_TOKEN_INSTANCE}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`בקשת Green API נכשלה (${response.status}): ${details}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ContactPayload> | null;

    const name = asTrimmedString(body?.name);
    const email = asTrimmedString(body?.email);
    const phone = asTrimmedString(body?.phone);
    const subject = asTrimmedString(body?.subject);
    const message = asTrimmedString(body?.message);

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "חובה למלא שם, אימייל והודעה." },
        { status: 400 }
      );
    }

    if (!GREEN_ADMIN_CHAT_ID) {
      return NextResponse.json(
        { ok: false, error: "חסר GREEN_ADMIN_CHAT_ID בקובץ הסביבה." },
        { status: 500 }
      );
    }

    const adminMessage = [
      "📩 פנייה חדשה מטופס יצירת קשר",
      "",
      `שם: ${name}`,
      `אימייל: ${email}`,
      `טלפון: ${phone || "-"}`,
      `נושא: ${subject || "-"}`,
      "",
      "הודעה:",
      message,
    ].join("\n");

    await sendWhatsAppMessage(GREEN_ADMIN_CHAT_ID, adminMessage);

    const customerChatId = phoneToChatId(phone);
    if (customerChatId) {
      const customerMessage = [
        "✅ קיבלנו את הפנייה שלך.",
        `תודה ${name}, נחזור אליך בהקדם.`,
        subject ? `נושא: ${subject}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await sendWhatsAppMessage(customerChatId, customerMessage);
      } catch (error) {
        console.error("[api/contact] customer confirmation failed", error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "ההודעה נשלחה בהצלחה.",
    });
  } catch (error) {
    console.error("[api/contact] failed to send via Green API", error);
    return NextResponse.json(
      {
        ok: false,
        error: "שליחת ההודעה נכשלה. נסו שוב בעוד רגע.",
      },
      { status: 500 }
    );
  }
}
