"use server";

import { prisma } from '@/lib/prisma';
import { Role, AuditAction } from '@prisma/client';
import { PasswordHasher } from '@/shared/infrastructure/security/PasswordHasher';
import { createSession, destroySession, requireRole, resolveBranchFilter } from '@/lib/auth';
import { getDefaultBranchId } from './branch';
import { logAudit, actorFieldsFromUser } from '@/lib/auditLog';

/** Auto-seeds an admin (useful for fresh installs), assigned to the default branch. */
async function seedAdminIfNeeded() {
  const usersCount = await prisma.user.count();
  if (usersCount === 0) {
    const branchId = await getDefaultBranchId();
    await prisma.user.create({
      data: {
        name: 'مدیر سیستم',
        username: 'admin',
        password: await PasswordHasher.hash('123'),
        roles: ['ADMIN'],
        branchId,
      }
    });
  }
}

export async function getUsers(branchId?: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    await seedAdminIfNeeded();

    const filterBranchId = resolveBranchFilter(auth.user, branchId);
    const users = await prisma.user.findMany({
      where: filterBranchId ? { branchId: filterBranchId } : {},
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        username: true,
        roles: true,
        createdAt: true,
        hourlyRate: true,
        branchId: true,
        branch: { select: { id: true, name: true } },
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
  hourlyRate?: number;
  branchId?: string;
}) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const existing = await prisma.user.findUnique({
      where: { username: data.username }
    });
    if (existing) {
      return { success: false, error: 'نام کاربری از قبل وجود دارد' };
    }

    // ADMIN can assign a new hire to any branch; if none is picked, the
    // new user lands on ADMIN's own branch (a sensible default, not a
    // security boundary — ADMIN can always move them later).
    const branchId = data.branchId || auth.user.branchId;
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return { success: false, error: 'شعبه‌ی انتخاب‌شده یافت نشد' };

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: await PasswordHasher.hash(data.password),
        roles: data.roles,
        hourlyRate: Number.isFinite(data.hourlyRate) && (data.hourlyRate as number) >= 0 ? data.hourlyRate : 0,
        branchId,
      }
    });
    
    // Don't return password
    const { password, ...safeUser } = newUser;

    await logAudit({
      ...actorFieldsFromUser(auth.user),
      action: AuditAction.USER_CREATED,
      entityType: 'User',
      entityId: newUser.id,
      metadata: { name: newUser.name, username: newUser.username, roles: newUser.roles, branchId: newUser.branchId },
    });

    return { success: true, user: safeUser };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: 'Failed to create user' };
  }
}

/** جابه‌جایی یک پرسنل به شعبه‌ی دیگر. */
export async function updateUserBranch(id: string, branchId: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return { success: false, error: 'شعبه‌ی انتخاب‌شده یافت نشد' };

    const user = await prisma.user.update({ where: { id }, data: { branchId } });
    const { password, ...safeUser } = user;
    return { success: true, user: safeUser };
  } catch (error) {
    console.error('Error updating user branch:', error);
    return { success: false, error: 'خطا در جابه‌جایی شعبه‌ی پرسنل' };
  }
}

/** به‌روزرسانی نرخ دستمزد ساعتی ثابت یک کاربر، مبنای محاسبه حقوق در ماژول شیفت‌بندی. */
export async function updateUserHourlyRate(id: string, hourlyRate: number) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return { success: false, error: 'نرخ ساعتی نامعتبر است' };
  }

  try {
    const user = await prisma.user.update({ where: { id }, data: { hourlyRate } });
    const { password, ...safeUser } = user;
    return { success: true, user: safeUser };
  } catch (error) {
    console.error('Error updating user hourly rate:', error);
    return { success: false, error: 'خطا در به‌روزرسانی نرخ ساعتی' };
  }
}

export async function deleteUser(id: string) {
  const auth = await requireRole('ADMIN');
  if (!auth.ok) return { success: false, error: auth.error };

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

    await logAudit({
      ...actorFieldsFromUser(auth.user),
      action: AuditAction.USER_DELETED,
      entityType: 'User',
      entityId: id,
      metadata: { name: userToDelete?.name, username: userToDelete?.username, roles: userToDelete?.roles },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

export async function loginUser(username: string, password: string) {
  try {
    await seedAdminIfNeeded();

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: { select: { id: true, name: true } } },
    });

    if (!user || !(await PasswordHasher.compare(password, user.password))) {
      await logAudit({
        actorUserId: user?.id ?? null,
        actorName: username,
        actorRole: null,
        action: AuditAction.LOGIN_FAILURE,
        entityType: 'User',
        entityId: user?.id,
        success: false,
      });
      return { success: false, error: 'نام کاربری یا رمز عبور اشتباه است' };
    }

    const { password: _, branch, ...safeUser } = user;

    // Establish a signed, httpOnly session cookie so subsequent Server Actions
    // can verify who is calling them (previously there was no server-side
    // session at all, so any client could call admin-only actions directly).
    await createSession({
      id: safeUser.id,
      username: safeUser.username,
      name: safeUser.name,
      roles: safeUser.roles,
      branchId: safeUser.branchId,
      branchName: branch?.name || '',
    });

    await logAudit({
      actorUserId: safeUser.id,
      actorName: safeUser.name,
      actorRole: safeUser.roles?.[0] ?? null,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: 'User',
      entityId: safeUser.id,
    });

    return { success: true, user: { ...safeUser, branchName: branch?.name || '' } };
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: 'System error during login' };
  }
}

export async function logoutUser() {
  try {
    await destroySession();
    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: 'Failed to log out' };
  }
}
