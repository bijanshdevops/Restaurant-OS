"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { logoutUser } from '@/app/actions/user';

export interface User {
  id: string;
  name: string;
  username: string;
  roles: string[];
  // --- Phase 5: multi-branch support ---
  branchId?: string;
  branchName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('restaurant_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('restaurant_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('restaurant_user', JSON.stringify(newUser));

    // A chef with no other role should land straight on the kitchen screen.
    // (This used to check a non-existent singular `newUser.role` field, so the
    // condition was always false and chefs never got redirected here.)
    if (newUser.roles?.includes('CHEF') && !newUser.roles.includes('ADMIN')) {
      router.push('/dashboard/kitchen');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('restaurant_user');
    await logoutUser();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
