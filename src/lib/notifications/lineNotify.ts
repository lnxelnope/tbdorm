import { Bill, LineNotifyConfig } from "@/types/dormitory";

const sendNotification = async (accessToken: string, message: string) => {
  try {
    const response = await fetch("/api/line-notify/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken, message }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};

export const sendBillCreatedNotification = async (
  config: LineNotifyConfig,
  bill: Bill
) => {
  if (!config.isActive || !config.notificationSettings.billCreated) return;

  const message = `\nสร้างบิลใหม่ 🧾\nห้อง: ${bill.roomId}\nประจำเดือน: ${
    new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
      month: "long",
      year: "numeric",
    })
  }\nยอดรวม: ฿${bill.totalAmount.toLocaleString()}\nกำหนดชำระ: ${new Date(
    bill.dueDate
  ).toLocaleDateString("th-TH")}`;

  return sendNotification(config.accessToken, message);
};

export const sendBillDueReminderNotification = async (
  config: LineNotifyConfig,
  bill: Bill
) => {
  if (!config.isActive || !config.notificationSettings.billDueReminder) return;

  const message = `\nแจ้งเตือนการชำระเงิน ⚠️\nห้อง: ${
    bill.roomId
  }\nประจำเดือน: ${new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
    month: "long",
    year: "numeric",
  })}\nยอดที่ต้องชำระ: ฿${bill.remainingAmount.toLocaleString()}\nกำหนดชำระ: ${new Date(
    bill.dueDate
  ).toLocaleDateString("th-TH")}`;

  return sendNotification(config.accessToken, message);
};

export const sendBillOverdueNotification = async (
  config: LineNotifyConfig,
  bill: Bill
) => {
  if (!config.isActive || !config.notificationSettings.billOverdue) return;

  const message = `\nแจ้งเตือนค้างชำระ ❌\nห้อง: ${
    bill.roomId
  }\nประจำเดือน: ${new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
    month: "long",
    year: "numeric",
  })}\nยอดค้างชำระ: ฿${bill.remainingAmount.toLocaleString()}\nกำหนดชำระ: ${new Date(
    bill.dueDate
  ).toLocaleDateString("th-TH")}`;

  return sendNotification(config.accessToken, message);
};

export const sendPaymentReceivedNotification = async (
  config: LineNotifyConfig,
  bill: Bill,
  amount: number
) => {
  if (!config.isActive || !config.notificationSettings.paymentReceived) return;

  const message = `\nได้รับการชำระเงิน ✅\nห้อง: ${
    bill.roomId
  }\nประจำเดือน: ${new Date(bill.year, bill.month - 1).toLocaleString("th-TH", {
    month: "long",
    year: "numeric",
  })}\nจำนวนเงิน: ฿${amount.toLocaleString()}\nยอดคงเหลือ: ฿${bill.remainingAmount.toLocaleString()}`;

  return sendNotification(config.accessToken, message);
};

export const sendUtilityReadingNotification = async (
  config: LineNotifyConfig,
  roomId: string,
  type: "water" | "electric",
  previousReading: number,
  currentReading: number,
  units: number
) => {
  if (!config.isActive || !config.notificationSettings.utilityReading) return;

  const message = `\nบันทึกค่ามิเตอร์ 📊\nห้อง: ${roomId}\nประเภท: ${
    type === "water" ? "น้ำประปา" : "ไฟฟ้า"
  }\nค่าเก่า: ${previousReading}\nค่าใหม่: ${currentReading}\nหน่วยที่ใช้: ${units} หน่วย`;

  return sendNotification(config.accessToken, message);
}; 