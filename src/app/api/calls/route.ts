import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    roomName: string;
    participantName: string;
    callType?: "audio" | "video";
    chatId?: string | null;
  };

  if (!body.roomName || !body.participantName) {
    return NextResponse.json(
      { error: "roomName and participantName are required." },
      { status: 400 },
    );
  }

  const callType = body.callType ?? "audio";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        token: null,
        roomName: body.roomName,
        provider: "demo",
        callType,
        chatId: body.chatId ?? null,
        participantName: body.participantName,
        startedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: body.participantName,
    name: body.participantName,
  });

  token.addGrant({
    roomJoin: true,
    room: body.roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  return NextResponse.json({
    token: jwt,
    roomName: body.roomName,
    provider: "livekit",
    callType,
    chatId: body.chatId ?? null,
    participantName: body.participantName,
    startedAt: new Date().toISOString(),
  });
}
