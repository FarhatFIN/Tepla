import { NextResponse } from "next/server";
import { storageService } from "@/server/services/storage.service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) ?? "document";
  const userId = (formData.get("userId") as string | null) ?? null;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided." },
      { status: 400 },
    );
  }

  try {
    const upload = await storageService.uploadFile(file, type, userId);

    return NextResponse.json(
      upload,
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file." },
      { status: 400 },
    );
  }
}
