import { NotificationType, Priority, Recurrence } from '@prisma/client';
import * as choreRepository from '../repositories/choreRepository';
import * as notificationRepository from '../repositories/notificationRepository';
import * as userRepository from '../repositories/userRepository';
import * as userService from './userService';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { ConflictError } from '../errors/ConflictError';
import { nextDueDate, todayUtc } from '../utils/dates';

type RequestingUser = { userId: number; householdId: number; role: string };
type Chore = NonNullable<Awaited<ReturnType<typeof choreRepository.findChoreById>>>;

export async function getAllChores(
  householdId: number,
  filters: choreRepository.ChoreFilters,
  pagination: { skip: number; take: number }
) {
  return await choreRepository.findAllChores(householdId, filters, pagination);
}

export async function getChoreById(choreId: number, householdId: number) {
  const chore = await choreRepository.findChoreById(choreId);
  if (!chore) {
    throw new NotFoundError('Chore');
  }
  if (chore.householdId !== householdId) {
    throw new ForbiddenError();
  }
  return chore;
}

// Creator, assignee and Owners manage a chore; an unassigned chore is everyone's.
function assertCanManage(chore: Chore, user: RequestingUser) {
  const allowed =
    user.role === 'Owner' ||
    chore.createdById === user.userId ||
    chore.assigneeId === null ||
    chore.assigneeId === user.userId;
  if (!allowed) {
    throw new ForbiddenError('Only the creator, the assignee or an Owner can change this chore');
  }
}

/** Notifies `recipientId` about something `actorId` did; nobody is notified about their own action. */
export async function notify(
  recipientId: number | null,
  actorId: number,
  type: NotificationType,
  text: (actorName: string) => string
) {
  if (recipientId === null || recipientId === actorId) {
    return;
  }
  const actor = await userRepository.findById(actorId);
  const actorName = actor ? actor.firstName : 'Someone';
  await notificationRepository.createNotification({
    userId: recipientId,
    type,
    message: text(actorName),
  });
}

export async function createChore(
  input: {
    title: string;
    description?: string | null | undefined;
    dueDate?: Date | null | undefined;
    recurrence?: Recurrence | undefined;
    priority?: Priority | undefined;
    assigneeId?: number | null | undefined;
  },
  requestingUser: RequestingUser
) {
  const assigneeId = input.assigneeId ?? null;
  if (assigneeId !== null) {
    await userService.getUserById(assigneeId, requestingUser.householdId);
  }

  const chore = await choreRepository.createChore({
    householdId: requestingUser.householdId,
    createdById: requestingUser.userId,
    assigneeId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    recurrence: input.recurrence ?? 'None',
    priority: input.priority ?? 'Normal',
  });

  await notify(
    assigneeId,
    requestingUser.userId,
    'ChoreAssigned',
    (name) => `${name} assigned you a chore: ${chore.title}`
  );
  return chore;
}

export async function updateChore(
  choreId: number,
  data: {
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
    recurrence?: Recurrence;
    priority?: Priority;
    assigneeId?: number | null;
  },
  requestingUser: RequestingUser
) {
  const chore = await getChoreById(choreId, requestingUser.householdId);
  assertCanManage(chore, requestingUser);
  if (chore.status === 'Done') {
    throw new ConflictError('A completed chore cannot be edited; reopen it first');
  }
  if (data.assigneeId !== undefined && data.assigneeId !== null) {
    await userService.getUserById(data.assigneeId, requestingUser.householdId);
  }

  const updated = await choreRepository.updateChore(choreId, data);

  if (data.assigneeId !== undefined && data.assigneeId !== chore.assigneeId) {
    await notify(
      data.assigneeId,
      requestingUser.userId,
      'ChoreAssigned',
      (name) => `${name} assigned you a chore: ${updated.title}`
    );
  }
  return updated;
}

export async function claimChore(choreId: number, requestingUser: RequestingUser) {
  const chore = await getChoreById(choreId, requestingUser.householdId);
  if (chore.status === 'Done') {
    throw new ConflictError('This chore is already done');
  }
  if (chore.assigneeId === requestingUser.userId) {
    return chore;
  }
  if (!(await choreRepository.claimIfUnassigned(choreId, requestingUser.userId))) {
    throw new ConflictError('This chore is already taken by someone else');
  }
  return await getChoreById(choreId, requestingUser.householdId);
}

export async function completeChore(choreId: number, requestingUser: RequestingUser) {
  const chore = await getChoreById(choreId, requestingUser.householdId);
  assertCanManage(chore, requestingUser);
  if (chore.status === 'Done') {
    throw new ConflictError('This chore is already done');
  }

  const next =
    chore.recurrence === 'None'
      ? null
      : {
          householdId: chore.householdId,
          createdById: chore.createdById,
          assigneeId: chore.assigneeId,
          title: chore.title,
          description: chore.description,
          recurrence: chore.recurrence,
          priority: chore.priority,
          dueDate: nextDueDate(chore.dueDate ?? todayUtc(), chore.recurrence),
        };

  const result = await choreRepository.completeChore(choreId, requestingUser.userId, next);
  if (!result) {
    throw new ConflictError('This chore is already done');
  }

  await notify(
    chore.createdById,
    requestingUser.userId,
    'ChoreCompleted',
    (name) => `${name} completed: ${chore.title}`
  );
  return result;
}

export async function reopenChore(choreId: number, requestingUser: RequestingUser) {
  const chore = await getChoreById(choreId, requestingUser.householdId);
  assertCanManage(chore, requestingUser);
  if (chore.status === 'Open') {
    throw new ConflictError('This chore is already open');
  }
  return await choreRepository.reopenChore(choreId);
}

export async function deleteChore(choreId: number, requestingUser: RequestingUser) {
  const chore = await getChoreById(choreId, requestingUser.householdId);
  if (chore.createdById !== requestingUser.userId && requestingUser.role !== 'Owner') {
    throw new ForbiddenError('Only the creator or an Owner can delete this chore');
  }
  return await choreRepository.removeChoreWithComments(choreId);
}
