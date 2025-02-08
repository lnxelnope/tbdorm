"use client";

import { useAuth } from '../lib/hooks/useAuth';
import Image from 'next/image';

export default function SignInWithGoogle() {
  const { signInWithGoogle } = useAuth();

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors"
    >
      <Image
        src="/images/google.svg"
        alt="Google logo"
        width={20}
        height={20}
      />
      Sign in with Google
    </button>
  );
}
