"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, CreditCard, Users, Bell, Shield } from 'lucide-react';
import PromptPayConfig from './components/PromptPayConfig';
import BankAccountConfig from './components/BankAccountConfig';
import LineConfig from './components/LineConfig';
import UserManagement from './components/UserManagement';
import AccessControl from './components/AccessControl';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('payment');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">การตั้งค่าระบบ</h1>
        <p className="mt-1 text-sm text-gray-500">
          จัดการการตั้งค่าระบบและความปลอดภัย
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span>การชำระเงิน</span>
          </TabsTrigger>
          <TabsTrigger value="line" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>LINE Official</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>ผู้ใช้งาน</span>
          </TabsTrigger>
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>สิทธิ์การเข้าถึง</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>ระบบ</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment">
          <div className="grid gap-4 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>การรับชำระเงิน</CardTitle>
                <CardDescription>
                  จัดการบัญชีธนาคารและ PromptPay สำหรับรับชำระเงิน
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BankAccountConfig />
                <PromptPayConfig />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="line">
          <Card>
            <CardHeader>
              <CardTitle>LINE Official Account</CardTitle>
              <CardDescription>
                ตั้งค่าการเชื่อมต่อและการแจ้งเตือนผ่าน LINE Official Account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>จัดการผู้ใช้งาน</CardTitle>
              <CardDescription>
                เพิ่ม ลบ แก้ไขข้อมูลผู้ใช้งานระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>สิทธิ์การเข้าถึง</CardTitle>
              <CardDescription>
                กำหนดสิทธิ์การเข้าถึงระบบสำหรับผู้ใช้งานแต่ละระดับ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccessControl />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>ตั้งค่าระบบ</CardTitle>
              <CardDescription>
                ตั้งค่าทั่วไปของระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* ส่วนตั้งค่าระบบอื่นๆ */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 