import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: "This is a simple API response to test if API routes are working",
      data: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error("API test failed:", error);
    
    return NextResponse.json({
      success: false,
      message: "API test failed",
      error: (error as Error).message
    }, { status: 500 });
  }
} 