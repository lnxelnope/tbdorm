import { ChatInterface } from "@/components/chat/ChatInterface";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          ทดสอบแชทกับ AI
        </h1>
        <ChatInterface />
      </div>
    </div>
  );
} 