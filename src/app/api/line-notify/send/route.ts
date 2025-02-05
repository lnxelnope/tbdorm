import { NextResponse } from "next/server";

interface SendNotificationRequest {
  accessToken: string;
  message: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendNotificationRequest;
    const { accessToken, message } = body;

    if (!accessToken || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const formData = new URLSearchParams();
    formData.append("message", message);

    const response = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to send notification", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error sending LINE notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 