"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebaseConfig';

interface LineSettings {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  notifyToken: string;
  isEnabled: boolean;
}

export default function LineConfig() {
  const [settings, setSettings] = useState<LineSettings>({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    notifyToken: '',
    isEnabled: false
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'line');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSettings(docSnap.data() as LineSettings);
        }
      } catch (error) {
        console.error('Error loading LINE settings:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดการตั้งค่า LINE');
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await setDoc(doc(db, 'settings', 'line'), settings);
      toast.success('บันทึกการตั้งค่า LINE สำเร็จ');
    } catch (error) {
      console.error('Error saving LINE settings:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า LINE');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Channel ID</label>
          <input
            type="text"
            value={settings.channelId}
            onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Channel Secret</label>
          <input
            type="password"
            value={settings.channelSecret}
            onChange={(e) => setSettings({ ...settings, channelSecret: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Channel Access Token</label>
          <input
            type="password"
            value={settings.channelAccessToken}
            onChange={(e) => setSettings({ ...settings, channelAccessToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">LINE Notify Token</label>
          <input
            type="password"
            value={settings.notifyToken}
            onChange={(e) => setSettings({ ...settings, notifyToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isEnabled"
            checked={settings.isEnabled}
            onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isEnabled" className="text-sm font-medium">
            เปิดใช้งานการแจ้งเตือนผ่าน LINE
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </div>
    </form>
  );
} 