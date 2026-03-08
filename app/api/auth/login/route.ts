import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as LoginBody | null;
    const username = body?.username?.trim();
    const password = body?.password;

    if (!username || !password) {
      return NextResponse.json(
        { error: "יש להזין שם משתמש וסיסמה" },
        { status: 400 }
      );
    }

    await dbConnect();

    let user = await User.findOne({ username });
    let bootstrap = false;

    if (!user) {
      const usersCount = await User.countDocuments();
      if (usersCount === 0) {
        user = await User.create({ username, password, role: "admin" });
        bootstrap = true;
      }
    }

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "שם משתמש או סיסמה אינם נכונים" },
        { status: 401 }
      );
    }

    const token = signToken({
      uid: user._id.toString(),
      username: user.username,
      role: "admin",
    });

    return NextResponse.json({
      token,
      user: { username: user.username, role: user.role },
      bootstrap,
    });
  } catch (error) {
    console.error("POST /api/auth/login failed:", error);
    return NextResponse.json(
      { error: "אירעה שגיאת שרת בזמן ההתחברות" },
      { status: 500 }
    );
  }
}
