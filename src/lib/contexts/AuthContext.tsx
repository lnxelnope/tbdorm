"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('AuthProvider mounted');
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user?.email);
        setUser(user);
        setLoading(false);
        setError(null);
      }, (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      });

      return () => {
        console.log('AuthProvider unmounted');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error in AuthProvider:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      console.log('Attempting to sign in with Google...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      console.log('Sign in successful:', result.user.email);
      toast.success(`ยินดีต้อนรับ ${result.user.email}`);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('คุณได้ปิดหน้าต่างเข้าสู่ระบบ');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('บราวเซอร์บล็อกป๊อปอัพ กรุณาอนุญาตให้เปิดป๊อปอัพ');
      } else {
        setError(error.message);
        toast.error(`เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ${error.message}`);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle }}>
      {error ? (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h2 className="text-red-600 text-lg font-semibold mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
