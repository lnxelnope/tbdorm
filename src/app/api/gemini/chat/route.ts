import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// สร้าง system prompt สำหรับให้ AI เข้าใจบริบทของแอพ
const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยสำหรับระบบจัดการหอพัก TB Dorm ที่มีฟีเจอร์ต่างๆ ดังนี้:
- จัดการข้อมูลผู้เช่า (เพิ่ม/แก้ไข/ลบ)
- จัดการห้องพัก (สถานะห้อง, ประเภทห้อง, ราคา)
- จัดการบิล/ใบแจ้งหนี้
- จดมิเตอร์น้ำ/ไฟ
- แจ้งซ่อม
- รายงานและสถิติต่างๆ
- แจ้งเตือนผ่าน LINE Notify

กรุณาตอบคำถามเกี่ยวกับการใช้งานระบบด้วยภาษาไทย ในรูปแบบที่เข้าใจง่าย`;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Get last user message
    const lastMessage = messages[messages.length - 1].content;

    // สร้าง chat model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Generate content
    const result = await model.generateContent([SYSTEM_PROMPT, lastMessage]);
    
    if (!result || !result.response) {
      throw new Error("Failed to generate content");
    }
    
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: text
          }
        }
      ]
    });

  } catch (error) {
    console.error("[GEMINI_ERROR]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 