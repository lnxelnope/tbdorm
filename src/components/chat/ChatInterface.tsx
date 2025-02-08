"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const userMessage = { role: "user" as const, content: input };
      setMessages(prev => [...prev, userMessage]);
      setInput("");

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ API");
      }

      const assistantMessage = data.choices[0].message;
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">      
      <div className="space-y-4">
        {messages.map((m, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl ${
              m.role === "assistant"
                ? "bg-gray-50 border border-gray-200"
                : "bg-yellow-50 border border-yellow-100"
            }`}
          >
            <p className="text-sm font-medium text-gray-500 mb-2">
              {m.role === "assistant" ? "AI" : "คุณ"}
            </p>
            <p className="text-gray-900 whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <p className="text-sm font-medium text-red-500">ข้อผิดพลาด</p>
            <p className="text-red-900">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-x-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์ข้อความของคุณที่นี่..."
          className="flex-1 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl text-gray-900"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 border border-gray-200"
          disabled={isLoading}
        >
          {isLoading ? "กำลังส่ง..." : "ส่ง"}
        </button>
      </form>
    </div>
  );
} 