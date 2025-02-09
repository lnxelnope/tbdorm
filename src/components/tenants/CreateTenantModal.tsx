const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    // สร้าง tenant document ใหม่
    const result = await addDoc(collection(db, 'tenants'), {
      name: formData.name,
      roomNumber: formData.roomNumber,
      roomId: selectedRoom?.id,
      dormitoryId: dormitoryId,
      tenantId: auth.currentUser?.uid || 'system',
      phone: formData.phone,
      email: formData.email,
      moveInDate: formData.moveInDate,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // อัพเดทสถานะห้อง
    if (selectedRoom) {
      await updateDoc(doc(db, 'rooms', selectedRoom.id), {
        status: 'occupied',
        tenantId: result.id,
        updatedAt: serverTimestamp()
      });
    }

    toast.success('เพิ่มผู้เช่าเรียบร้อย');
    onClose();
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Error adding tenant:', error);
    toast.error('เกิดข้อผิดพลาดในการเพิ่มผู้เช่า');
  } finally {
    setIsSubmitting(false);
  }
}; 