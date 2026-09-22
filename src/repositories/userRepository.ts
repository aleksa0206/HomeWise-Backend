import { User } from '@prisma/client';
import { prisma } from '../config/prismaClient';
import { Prisma } from '@prisma/client';
import { compact } from '../utils/queryParams';

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;
type Role = 'Owner' | 'Member';

const userSafeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  householdId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserFilters = {
  role?: Role | undefined;
  /** Matches first name, last name or email (case-insensitive with MySQL's default collation). */
  search?: string | undefined;
};

export async function findAll(
  householdId: number,
  filters: UserFilters,
  pagination: { skip: number; take: number }
) {
  const where = compact({
    householdId,
    role: filters.role,
    OR: filters.search
      ? [
          { firstName: { contains: filters.search } },
          { lastName: { contains: filters.search } },
          { email: { contains: filters.search } },
        ]
      : undefined,
  });
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSafeSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.user.count({ where }),
  ]);
  return { data, total };
}

export async function findById(userId: number) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: userSafeSelect,
  });
}

export async function create(
  data: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    role: Role;
    householdId: number;
  },
  client: PrismaClientOrTx = prisma
) {
  return await client.user.create({ data, select: userSafeSelect });
}

export async function update(
  userId: number,
  data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  }>
) {
  return await prisma.user.update({
    where: { id: userId },
    data,
    select: userSafeSelect,
  });
}

export async function remove(userId: number) {
  return await prisma.user.delete({
    where: { id: userId },
    select: userSafeSelect,
  });
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({ where: { email } });
}

export function toSafeUser(user: User): Pick<User, keyof typeof userSafeSelect> {
  const keys = Object.keys(userSafeSelect) as (keyof typeof userSafeSelect)[];
  return Object.fromEntries(keys.map((key) => [key, user[key]])) as Pick<
    User,
    keyof typeof userSafeSelect
  >;
}

export async function incrementFailedLoginAttempts(userId: number) {
  return await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
  });
}

export async function setAccountLock(
  userId: number,
  lockedUntil: Date | null,
  failedLoginAttempts: number
) {
  return await prisma.user.update({
    where: { id: userId },
    data: { lockedUntil, failedLoginAttempts },
  });
}

export async function setTwoFactorSecret(userId: number, secret: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });
}

export async function enableTwoFactor(userId: number) {
  return await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
}

export async function disableTwoFactor(userId: number) {
  return await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
}

export async function findByIdWithAuthFields(userId: number) {
  return await prisma.user.findUnique({ where: { id: userId } });
}

export async function setPasswordResetToken(
  userId: number,
  tokenHash: string | null,
  expiresAt: Date | null
) {
  return await prisma.user.update({
    where: { id: userId },
    data: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt },
  });
}

export async function findByResetTokenHash(tokenHash: string) {
  return await prisma.user.findFirst({ where: { resetPasswordTokenHash: tokenHash } });
}

export async function updatePassword(userId: number, passwordHash: string) {
  return await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
