import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/userRepository';
import * as auditLogRepository from '../repositories/auditLogRepository';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';

type Role = 'Owner' | 'Member';
type RequestingUser = { userId: number; householdId: number; role: string };

export async function getAllUsers(
  householdId: number,
  filters: userRepository.UserFilters,
  pagination: { skip: number; take: number }
) {
  return await userRepository.findAll(householdId, filters, pagination);
}

export async function getUserById(userId: number, householdId: number) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User');
  }
  if (user.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return user;
}

// Members get an account from the Owner; there is no invite flow yet.
export async function createUser(
  input: { firstName: string; lastName: string; email: string; password: string; role: Role },
  requestingUser: RequestingUser
) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return await userRepository.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    passwordHash,
    role: input.role,
    householdId: requestingUser.householdId,
  });
}

export async function updateUser(
  targetUserId: number,
  data: { firstName?: string; lastName?: string; email?: string; role?: Role },
  requestingUser: RequestingUser
) {
  const existing = await getUserById(targetUserId, requestingUser.householdId);

  const isSelf = requestingUser.userId === targetUserId;
  const isOwner = requestingUser.role === 'Owner';

  if (!isSelf && !isOwner) {
    throw new ForbiddenError('You can only update your own profile');
  }
  if (data.role !== undefined && !isOwner) {
    throw new ForbiddenError('Only an Owner can change roles');
  }
  // Owners cannot demote themselves, so a household always keeps at least one Owner.
  if (data.role !== undefined && isSelf && data.role !== existing.role) {
    throw new ForbiddenError('You cannot change your own role');
  }

  const updated = await userRepository.update(targetUserId, data);

  if (data.role !== undefined && data.role !== existing.role) {
    await auditLogRepository.createAuditLog({
      performedById: requestingUser.userId,
      entityId: targetUserId,
      entityType: 'User',
      action: 'ROLE_CHANGE',
      oldValue: existing.role,
      newValue: data.role,
      householdId: requestingUser.householdId,
    });
  }

  return updated;
}

export async function deleteUser(targetUserId: number, requestingUser: RequestingUser) {
  if (requestingUser.userId === targetUserId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  const existing = await getUserById(targetUserId, requestingUser.householdId);
  const deleted = await userRepository.remove(targetUserId);

  await auditLogRepository.createAuditLog({
    performedById: requestingUser.userId,
    entityId: targetUserId,
    entityType: 'User',
    action: 'DELETE_USER',
    oldValue: `${existing.firstName} ${existing.lastName} (${existing.email})`,
    householdId: requestingUser.householdId,
  });

  return deleted;
}
