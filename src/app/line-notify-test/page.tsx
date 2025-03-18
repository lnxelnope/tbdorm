'use client';

import { useState } from 'react';

export default function LineNotifyTestPage() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{
    loading: boolean;
    success?: boolean;
    error?: string;
  }>({ loading: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message) {
      setStatus({
        loading: false,
        success: false,
        error: 'กรุณาระบุข้อความ'
      });
      return;
    }
    
    setStatus({ loading: true });
    
    try {
      const response = await fetch('/api/line/send-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อความ');
      }
      
      setStatus({
        loading: false,
        success: true,
      });
      
      // เคลียร์ข้อความหลังจากส่งสำเร็จ
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งข้อความ',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold mb-6 text-center">ทดสอบส่งข้อความผ่าน LINE Notify</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            ข้อความ
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={4}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={status.loading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            status.loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {status.loading ? 'กำลังส่ง...' : 'ส่งข้อความ'}
        </button>
      </form>
      
      {status.success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
          ส่งข้อความสำเร็จ!
        </div>
      )}
      
      {status.error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {status.error}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <p className="mb-2">วิธีการตั้งค่า LINE Notify:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>เข้าไปที่ <a href="https://notify-bot.line.me/my/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">LINE Notify</a></li>
          <li>ล็อกอินด้วยบัญชี LINE ของคุณ</li>
          <li>คลิกที่ "Generate token"</li>
          <li>ตั้งชื่อและเลือกกลุ่มหรือห้องแชทที่ต้องการส่งข้อความ</li>
          <li>คัดลอก token ที่ได้ไปใส่ในไฟล์ .env ของโปรเจค</li>
        </ol>
      </div>
    </div>
  );
} 