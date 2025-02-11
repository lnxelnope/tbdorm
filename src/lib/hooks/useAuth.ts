import { useContext } from 'react';
import { AuthContext } from "../contexts/AuthContext";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // เพิ่มฟังก์ชันเช็คสิทธิ์ admin
  const isAdmin = async () => {
    if (!context.user) return false;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', context.user.uid));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return userData.role === 'admin' || userData.role === 'owner';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  return {
    ...context,
    isAdmin
  };
};