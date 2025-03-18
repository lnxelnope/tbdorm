"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getDormitory, updateDormitory } from "@/lib/firebase/firebaseUtils";
import { Dormitory } from "@/types/dormitory";
import Image from "next/image";
import Link from "next/link";

interface BillTemplate {
  accountNumber: string;
  accountName: string;
  bankName: string;
  qrCodeUrl: string;
  additionalNotes: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string;
  footerText: string;
}

declare module "@/types/dormitory" {
  interface Dormitory {
    billTemplate?: BillTemplate;
  }
}

export default function BillTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const dormitoryId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dormitory, setDormitory] = useState<Dormitory | null>(null);
  const [billTemplate, setBillTemplate] = useState<BillTemplate>({
    accountNumber: "",
    accountName: "",
    bankName: "",
    qrCodeUrl: "",
    additionalNotes: "",
    companyName: "",
    companyAddress: "",
    companyPhone: "",
    companyEmail: "",
    companyLogo: "",
    footerText: ""
  });
  
  useEffect(() => {
    const fetchDormitory = async () => {
      try {
        setIsLoading(true);
        const result = await getDormitory(dormitoryId);
        if (result.success && result.data) {
          setDormitory(result.data);
          
          if (result.data.billTemplate) {
            setBillTemplate({
              accountNumber: result.data.billTemplate.accountNumber || "",
              accountName: result.data.billTemplate.accountName || "",
              bankName: result.data.billTemplate.bankName || "",
              qrCodeUrl: result.data.billTemplate.qrCodeUrl || "",
              additionalNotes: result.data.billTemplate.additionalNotes || "",
              companyName: result.data.billTemplate.companyName || result.data.name || "",
              companyAddress: result.data.billTemplate.companyAddress || result.data.address || "",
              companyPhone: result.data.billTemplate.companyPhone || "",
              companyEmail: result.data.billTemplate.companyEmail || "",
              companyLogo: result.data.billTemplate.companyLogo || "",
              footerText: result.data.billTemplate.footerText || ""
            });
          } else {
            setBillTemplate({
              ...billTemplate,
              companyName: result.data.name || "",
              companyAddress: result.data.address || ""
            });
          }
        } else {
          toast.error("ไม่พบข้อมูลหอพัก");
          router.push("/dormitories");
        }
      } catch (error) {
        console.error("Error fetching dormitory:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลหอพัก");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDormitory();
  }, [dormitoryId, router]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBillTemplate(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (!dormitory) {
        toast.error("ไม่พบข้อมูลหอพัก");
        return;
      }
      
      const updatedDormitory = {
        ...dormitory,
        billTemplate
      };
      
      const result = await updateDormitory(dormitoryId, updatedDormitory);
      
      if (result.success) {
        toast.success("บันทึกรูปแบบบิลเรียบร้อย");
      } else {
        toast.error("ไม่สามารถบันทึกรูปแบบบิลได้");
      }
    } catch (error) {
      console.error("Error saving bill template:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกรูปแบบบิล");
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
        <p className="ml-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/dormitories" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">ตั้งค่ารูปแบบบิล - {dormitory?.name}</h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              บันทึก
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลการชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="bankName" className="block text-sm font-medium mb-1">ธนาคาร</label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={billTemplate.bankName}
                  onChange={handleChange}
                  placeholder="ชื่อธนาคาร"
                />
              </div>
              
              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium mb-1">เลขที่บัญชี</label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={billTemplate.accountNumber}
                  onChange={handleChange}
                  placeholder="เลขที่บัญชีสำหรับการโอนเงิน"
                />
              </div>
              
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium mb-1">ชื่อบัญชี</label>
                <Input
                  id="accountName"
                  name="accountName"
                  value={billTemplate.accountName}
                  onChange={handleChange}
                  placeholder="ชื่อบัญชีสำหรับการโอนเงิน"
                />
              </div>
              
              <div>
                <label htmlFor="qrCodeUrl" className="block text-sm font-medium mb-1">QR Code สำหรับชำระเงิน (URL)</label>
                <Input
                  id="qrCodeUrl"
                  name="qrCodeUrl"
                  value={billTemplate.qrCodeUrl}
                  onChange={handleChange}
                  placeholder="URL ของรูปภาพ QR Code"
                />
              </div>
              
              {billTemplate.qrCodeUrl && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">ตัวอย่าง QR Code:</p>
                  <div className="border rounded p-4 flex justify-center">
                    <Image
                      src={billTemplate.qrCodeUrl}
                      alt="QR Code"
                      width={150}
                      height={150}
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลบริษัท/หอพัก</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium mb-1">ชื่อบริษัท/หอพัก</label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={billTemplate.companyName}
                  onChange={handleChange}
                  placeholder="ชื่อบริษัทหรือหอพัก"
                />
              </div>
              
              <div>
                <label htmlFor="companyAddress" className="block text-sm font-medium mb-1">ที่อยู่</label>
                <textarea
                  id="companyAddress"
                  name="companyAddress"
                  value={billTemplate.companyAddress}
                  onChange={handleChange}
                  placeholder="ที่อยู่บริษัทหรือหอพัก"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div>
                <label htmlFor="companyPhone" className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
                <Input
                  id="companyPhone"
                  name="companyPhone"
                  value={billTemplate.companyPhone}
                  onChange={handleChange}
                  placeholder="เบอร์โทรศัพท์ติดต่อ"
                />
              </div>
              
              <div>
                <label htmlFor="companyEmail" className="block text-sm font-medium mb-1">อีเมล</label>
                <Input
                  id="companyEmail"
                  name="companyEmail"
                  value={billTemplate.companyEmail}
                  onChange={handleChange}
                  placeholder="อีเมลติดต่อ"
                />
              </div>
              
              <div>
                <label htmlFor="companyLogo" className="block text-sm font-medium mb-1">โลโก้บริษัท/หอพัก (URL)</label>
                <Input
                  id="companyLogo"
                  name="companyLogo"
                  value={billTemplate.companyLogo}
                  onChange={handleChange}
                  placeholder="URL ของรูปภาพโลโก้"
                />
              </div>
              
              {billTemplate.companyLogo && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">ตัวอย่างโลโก้:</p>
                  <div className="border rounded p-4 flex justify-center">
                    <Image
                      src={billTemplate.companyLogo}
                      alt="Company Logo"
                      width={150}
                      height={80}
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>ข้อความเพิ่มเติม</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label htmlFor="additionalNotes" className="block text-sm font-medium mb-1">ข้อความเพิ่มเติมในบิล</label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={billTemplate.additionalNotes}
                  onChange={handleChange}
                  placeholder="ข้อความเพิ่มเติมที่ต้องการแสดงในบิล เช่น วิธีการชำระเงิน หรือข้อควรระวัง"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="footerText" className="block text-sm font-medium mb-1">ข้อความท้ายบิล</label>
                <textarea
                  id="footerText"
                  name="footerText"
                  value={billTemplate.footerText}
                  onChange={handleChange}
                  placeholder="ข้อความที่จะแสดงที่ท้ายบิล เช่น ขอบคุณที่ใช้บริการ"
                  rows={2}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>ตัวอย่างบิล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex justify-between mb-6">
                <div className="flex items-start">
                  {billTemplate.companyLogo && (
                    <div className="mr-4">
                      <Image
                        src={billTemplate.companyLogo}
                        alt="Company Logo"
                        width={100}
                        height={50}
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{billTemplate.companyName || "ชื่อหอพัก"}</h3>
                    <p className="text-gray-600 text-sm">{billTemplate.companyAddress || "ที่อยู่หอพัก"}</p>
                    {billTemplate.companyPhone && <p className="text-gray-600 text-sm">โทร: {billTemplate.companyPhone}</p>}
                    {billTemplate.companyEmail && <p className="text-gray-600 text-sm">อีเมล: {billTemplate.companyEmail}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">ใบแจ้งค่าเช่า</p>
                  <p className="text-gray-600">ประจำเดือน {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
                  <p className="font-medium">วันที่ออกบิล: {new Date().toLocaleDateString('th-TH')}</p>
                  <p className="font-medium">กำหนดชำระ: {new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString('th-TH')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="font-medium mb-1">ข้อมูลผู้เช่า</h4>
                  <p>ชื่อผู้เช่า: [ชื่อผู้เช่า]</p>
                  <p>ห้อง: [เลขห้อง]</p>
                  <p>โทร: [เบอร์โทรผู้เช่า]</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">ข้อมูลการชำระเงิน</h4>
                  {billTemplate.bankName && <p>ธนาคาร: {billTemplate.bankName}</p>}
                  {billTemplate.accountNumber && <p>เลขที่บัญชี: {billTemplate.accountNumber}</p>}
                  {billTemplate.accountName && <p>ชื่อบัญชี: {billTemplate.accountName}</p>}
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-medium mb-2">รายละเอียดค่าใช้จ่าย</h4>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">รายการ</th>
                      <th className="px-4 py-2 text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-2">ค่าเช่าห้อง</td>
                      <td className="px-4 py-2 text-right">0 บาท</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">ค่าน้ำ</td>
                      <td className="px-4 py-2 text-right">0 บาท</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">ค่าไฟ</td>
                      <td className="px-4 py-2 text-right">0 บาท</td>
                    </tr>
                    <tr className="font-bold bg-gray-50">
                      <td className="px-4 py-2">รวมทั้งสิ้น</td>
                      <td className="px-4 py-2 text-right">0 บาท</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm text-gray-600">
                  {billTemplate.additionalNotes && (
                    <div className="mb-2">
                      <p className="font-medium">หมายเหตุ:</p>
                      <p>{billTemplate.additionalNotes}</p>
                    </div>
                  )}
                  {billTemplate.footerText && <p className="mt-4">{billTemplate.footerText}</p>}
                </div>
                <div className="flex justify-center">
                  {billTemplate.qrCodeUrl && (
                    <div className="text-center">
                      <p className="text-sm font-medium mb-2">สแกนเพื่อชำระเงิน</p>
                      <Image
                        src={billTemplate.qrCodeUrl}
                        alt="QR Code"
                        width={120}
                        height={120}
                        className="object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 