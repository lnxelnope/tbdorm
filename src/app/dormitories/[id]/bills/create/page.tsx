import {
  getBills,
  addPayment,
  getPromptPayConfig,
  getLineNotifyConfig,
} from "@/lib/firebase/firebaseUtils";
import { sendBillCreatedNotification } from "@/lib/notifications/lineNotify";

// ... existing code ...

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedRoom) {
    toast.error("กรุณาเลือกห้อง");
    return;
  }

  try {
    setIsSubmitting(true);
    const room = rooms.find((r) => r.id === selectedRoom);
    const tenant = tenants.find((t) => t.roomNumber === room?.number);
    if (!room || !tenant) {
      toast.error("ไม่พบข้อมูลห้องหรือผู้เช่า");
      return;
    }

    const totalAmount = formData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const billData: Omit<Bill, "id" | "createdAt" | "updatedAt"> = {
      dormitoryId: params.id,
      roomId: room.number,
      tenantId: tenant.id,
      month: formData.month,
      year: formData.year,
      dueDate: new Date(formData.dueDate),
      status: "pending",
      items: formData.items,
      totalAmount,
      paidAmount: 0,
      remainingAmount: totalAmount,
      payments: [],
      notificationsSent: {
        initial: false,
        reminder: false,
        overdue: false,
      },
    };

    const result = await createBill(params.id, billData);
    if (result.success) {
      // ส่งแจ้งเตือนผ่าน LINE
      const lineConfig = await getLineNotifyConfig(params.id);
      if (lineConfig.success && lineConfig.data) {
        await sendBillCreatedNotification(lineConfig.data, {
          ...billData,
          id: result.id!,
        });
      }

      toast.success("สร้างบิลเรียบร้อย");
      router.push(`/dormitories/${params.id}/bills`);
    }
  } catch (error) {
    console.error("Error creating bill:", error);
    toast.error("เกิดข้อผิดพลาดในการสร้างบิล");
  } finally {
    setIsSubmitting(false);
  }
};

// ... existing code ...