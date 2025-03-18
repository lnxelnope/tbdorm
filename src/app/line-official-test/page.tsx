'use client';

import { useState } from 'react';

export default function LineOfficialTestPage() {
  const [userId, setUserId] = useState('U753e4bdf72673949bff9e9feb0ce340d');
  const [message, setMessage] = useState('');
  const [quoteToken, setQuoteToken] = useState('');
  const [status, setStatus] = useState<{
    loading: boolean;
    success?: boolean;
    error?: string;
    response?: any;
  }>({ loading: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !message) {
      setStatus({
        loading: false,
        success: false,
        error: 'กรุณาระบุ User ID และข้อความ'
      });
      return;
    }
    
    setStatus({ loading: true });
    
    try {
      const payload: any = { userId, message };
      
      // เพิ่ม quoteToken ถ้ามี
      if (quoteToken) {
        payload.quoteToken = quoteToken;
      }
      
      const response = await fetch('/api/line/send-official', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อความ');
      }
      
      setStatus({
        loading: false,
        success: true,
        response: data.response
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
      <h1 className="text-2xl font-bold mb-6 text-center">ทดสอบส่งข้อความผ่าน LINE Official Account</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
            LINE User ID
          </label>
          <input
            type="text"
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>
        
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
        
        <div>
          <label htmlFor="quoteToken" className="block text-sm font-medium text-gray-700 mb-1">
            Quote Token (ถ้ามี)
          </label>
          <input
            type="text"
            id="quoteToken"
            value={quoteToken}
            onChange={(e) => setQuoteToken(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            ใช้สำหรับอ้างอิงข้อความก่อนหน้า (ไม่จำเป็นต้องระบุ)
          </p>
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
          <p>ส่งข้อความสำเร็จ!</p>
          {status.response && (
            <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-green-50 rounded">
              {JSON.stringify(status.response, null, 2)}
            </pre>
          )}
        </div>
      )}
      
      {status.error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {status.error}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <p className="mb-2">หมายเหตุ:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ผู้ใช้ต้องเพิ่ม LINE Official Account เป็นเพื่อนก่อนจึงจะสามารถส่งข้อความได้</li>
          <li>User ID ต้องเป็น LINE User ID ที่ถูกต้อง (ขึ้นต้นด้วย "U")</li>
          <li>Quote Token ใช้สำหรับอ้างอิงข้อความก่อนหน้า</li>
        </ul>
      </div>
    </div>
  );
} 