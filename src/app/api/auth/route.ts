import { NextResponse } from "next/server";
import { usersRepository } from "@/server/database/users.repository";
import { usersService } from "@/server/services/users.service";
import { mapAuthUser } from "@/server/services/mappers";
import { normalizeEmail, normalizePhone } from "@/server/validation/validators";
import Twilio from "twilio";

type AuthMode =
  | "start_phone_login"
  | "verify_phone_login"
  | "register";

type StartPhoneLoginBody = {
  mode: "start_phone_login";
  phone?: string;
  email?: string;
};

type VerifyPhoneLoginBody = {
  mode: "verify_phone_login";
  phone: string;
  otp: string;
};

type RegisterBody = {
  mode: "register";
  phone?: string;
  email?: string;
  username: string;
  displayName?: string;
  language?: string;
  birthDate?: string;
};

type AuthRequestBody =
  | StartPhoneLoginBody
  | VerifyPhoneLoginBody
  | RegisterBody;

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

const getTwilioClient = () => {
  if (!twilioAccountSid || !twilioAuthToken) {
    throw new Error("Twilio environment variables are not configured.");
  }
  return Twilio(twilioAccountSid, twilioAuthToken);
};

const generateOtp = (): string =>
  String(Math.floor(100000 + Math.random() * 900000));

export async function POST(request: Request) {
  const body = (await request.json()) as AuthRequestBody;
  const mode: AuthMode = body.mode;

  if (mode === "start_phone_login") {
    const { phone, email } = body as StartPhoneLoginBody;
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedPhone && !normalizedEmail) {
      return NextResponse.json(
        { error: "Phone or email is required." },
        { status: 400 },
      );
    }

    if (!twilioFromNumber) {
      return NextResponse.json(
        { error: "Phone login is not configured." },
        { status: 500 },
      );
    }

    const otp = generateOtp();
    const client = getTwilioClient();

    if (normalizedPhone) {
      await client.messages.create({
        to: normalizedPhone,
        from: twilioFromNumber,
        body: `Your Tepla verification code is ${otp}`,
      });
    }

    const res = new NextResponse(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
    res.headers.set(
      "Set-Cookie",
      `tepla_otp=${encodeURIComponent(
        JSON.stringify({ phone: normalizedPhone, email: normalizedEmail, otp }),
      )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
    );
    return res;
  }

  if (mode === "verify_phone_login") {
    const { phone, otp } = body as VerifyPhoneLoginBody;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !otp) {
      return NextResponse.json(
        { error: "Phone and code are required." },
        { status: 400 },
      );
    }

    const cookieHeader = request.headers.get("cookie") ?? "";
    const otpCookie = cookieHeader
      .split(";")
      .map((segment) => segment.trim())
      .find((segment) => segment.startsWith("tepla_otp="));

    if (!otpCookie) {
      return NextResponse.json(
        { error: "No active verification session." },
        { status: 400 },
      );
    }

    const raw = decodeURIComponent(otpCookie.split("=")[1]);
    const payload = JSON.parse(raw) as { phone?: string; email?: string; otp: string };

    if (payload.phone !== normalizedPhone || payload.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 },
      );
    }

    const existingUser = await usersRepository.findByPhone(normalizedPhone);

    if (!existingUser) {
      return NextResponse.json(
        { error: "No account found for this phone. Please register first." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: true, user: mapAuthUser(existingUser) },
      { status: 200 },
    );
  }

  if (mode === "register") {
    const { phone, email, username, displayName, language, birthDate } =
      body as RegisterBody;
    try {
      const result = await usersService.register({
        phone,
        email,
        username,
        displayName,
        language,
        birthDate,
      });

      return NextResponse.json(
        {
          ok: true,
          userId: result.profile.id,
          user: result.user,
        },
        { status: 201 },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create account.";
      const status =
        message.includes("already taken") || message.includes("already exists") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  }

  return NextResponse.json({ error: "Unsupported mode." }, { status: 400 });
}

