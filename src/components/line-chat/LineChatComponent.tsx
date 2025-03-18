'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function LineChatComponent() {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addLog = (log: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  };

  const sendTextMessage = async () => {
    if (!userId || !message) {
      toast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอก User ID และข้อความที่ต้องการส่ง',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
          type: 'text',
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'ส่งข้อความสำเร็จ',
          description: 'ข้อความถูกส่งไปยัง Line Official Account เรียบร้อยแล้ว',
        });
        addLog(`ส่งข้อความสำเร็จ: "${message}" ไปยัง ${userId}`);
        setMessage('');
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถส่งข้อความได้',
          variant: 'destructive',
        });
        addLog(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        variant: 'destructive',
      });
      addLog(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const sendImage = async () => {
    if (!userId || !fileInputRef.current?.files?.[0]) {
      toast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอก User ID และเลือกรูปภาพที่ต้องการส่ง',
        variant: 'destructive',
      });
      return;
    }

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('image', file);

    setLoading(true);
    try {
      const response = await fetch('/api/line/send-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'ส่งรูปภาพสำเร็จ',
          description: 'รูปภาพถูกส่งไปยัง Line Official Account เรียบร้อยแล้ว',
        });
        addLog(`ส่งรูปภาพสำเร็จ: "${file.name}" ไปยัง ${userId}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถส่งรูปภาพได้',
          variant: 'destructive',
        });
        addLog(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        variant: 'destructive',
      });
      addLog(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>ส่งข้อความ Line</CardTitle>
          <p className="text-sm text-muted-foreground">
            ส่งข้อความและรูปภาพผ่าน Make.com ไปยัง Line Official Account
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Line User ID</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="ระบุ Line User ID"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              ระบุ User ID ของผู้ใช้ Line ที่ต้องการส่งข้อความ
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ข้อความ</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ข้อความที่ต้องการส่ง..."
              className="w-full min-h-[100px]"
            />
          </div>
          
          <Button 
            onClick={sendTextMessage} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'กำลังส่ง...' : 'ส่งข้อความ'}
          </Button>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">ส่งรูปภาพ</label>
            <Input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="w-full mb-2"
            />
            <Button 
              onClick={sendImage} 
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? 'กำลังส่ง...' : 'ส่งรูปภาพ'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการส่ง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-3 rounded-md h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">ยังไม่มีประวัติการส่ง</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log, index) => (
                  <li key={index} className="text-sm border-b pb-1 last:border-0">
                    {log}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 