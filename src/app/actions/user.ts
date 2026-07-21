"use server";

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function getUsers() {
  try {
    const usersCount = await prisma.user.count();
    
    // Auto-seed an admin if no users exist
    if (usersCount === 0) {
      await prisma.user.create({
        data: {
          name: 'مدیر سیستم',
          username: 'admin',
          password: '123', // In a real app, this should be hashed
          roles: ['ADMIN'],
        }
      });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        roles: true,
        createdAt: true,
        // Exclude password from the API response for security
      }
    });

    return { success: true, users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

export async function createUser(data: {
  name: string;
  username: string;
  password: string;
  roles: Role[];
}) {
  try {
    const existing = await prisma.user.findUnique({
      where: { username: data.username }
    });
    if (existing) {
      return { success: false, error: 'نام کاربری از قبل وجود دارد' };
    }

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password, // In a real app, hash this!
        roles: data.roles,
      }
    });
    
    // Don't return password
    const { password, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

export async function deleteUser(id: string) {
  try {
    // Prevent deleting the very last admin
    const adminCount = await prisma.user.count({
      where: { roles: { has: 'ADMIN' } }
    });
    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (userToDelete?.roles.includes('ADMIN') && adminCount <= 1) {
      return { success: false, error: 'نمی‌توانید تنها مدیر سیستم را حذف کنید' };
    }

    await prisma.user.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

export async function loginUser(username: string, password: string) {
  try {
    // Auto-seed an admin if no users exist (useful for fresh installs)
    const usersCount = await prisma.user.count();
    if (usersCount === 0) {
      await prisma.user.create({
        data: {
          name: 'مدیر سیستم',
          username: 'admin',
          password: '123',
          roles: ['ADMIN'],
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || user.password !== password) {
      return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
    }

    const { password: _, ...safeUser } = user;
    return { success: true, user: safeUser };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'System error during login' };
  }
}
