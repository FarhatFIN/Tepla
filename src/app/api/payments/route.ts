import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/db";
import { sendTonTransfer } from "@/lib/ton";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    senderId: string;
    recipientId: string;
    amount: number;
    currency: "USD" | "TON" | "USDT";
    type: "ton_transfer";
    toAddress: string;
    messageId?: string;
  };

  if (!body.senderId || !body.recipientId || !body.amount || !body.toAddress) {
    return NextResponse.json(
      { error: "senderId, recipientId, amount, and toAddress are required." },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabaseClient();

  let txHash: string | null = null;
  let status: "pending" | "completed" | "failed" = "pending";

  if (body.currency === "TON" || body.currency === "USDT") {
    try {
      txHash = await sendTonTransfer({
        toAddress: body.toAddress,
        amountTon: body.amount,
        comment: body.currency === "USDT" ? "USDT transfer" : undefined,
      });
      status = "completed";
    } catch {
      status = "failed";
    }
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      sender_id: body.senderId,
      recipient_id: body.recipientId,
      message_id: body.messageId ?? null,
      amount: body.amount,
      currency: body.currency,
      status,
      tx_hash: txHash,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to record payment." },
      { status: 500 },
    );
  }

  return NextResponse.json({ payment: data }, { status: 201 });
}

