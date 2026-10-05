import * as commentRepository from '../repositories/commentRepository';
import * as choreService from './choreService';
import { NotFoundError } from '../errors/NotFoundError';
import { ForbiddenError } from '../errors/ForbiddenError';

type RequestingUser = { userId: number; householdId: number; role: string };

export async function getAllComments(
  householdId: number,
  choreId: number,
  pagination: { skip: number; take: number }
) {
  await choreService.getChoreById(choreId, householdId);
  return await commentRepository.findAllComments(householdId, choreId, pagination);
}

export async function createComment(
  data: { choreId: number; text: string },
  requestingUser: RequestingUser
) {
  const chore = await choreService.getChoreById(data.choreId, requestingUser.householdId);
  const comment = await commentRepository.createComment({
    choreId: chore.id,
    authorId: requestingUser.userId,
    householdId: requestingUser.householdId,
    text: data.text,
  });

  const recipients = new Set([chore.createdById, chore.assigneeId]);
  for (const recipientId of recipients) {
    await choreService.notify(
      recipientId,
      requestingUser.userId,
      'ChoreCommented',
      (name) => `${name} commented on: ${chore.title}`
    );
  }
  return comment;
}

async function getEditableComment(commentId: number, requestingUser: RequestingUser) {
  const comment = await commentRepository.findCommentById(commentId);
  if (!comment) {
    throw new NotFoundError('Comment');
  }
  if (comment.householdId !== requestingUser.householdId) {
    throw new ForbiddenError();
  }
  if (comment.authorId !== requestingUser.userId && requestingUser.role !== 'Owner') {
    throw new ForbiddenError('You can only modify your own comments');
  }
  return comment;
}

export async function updateComment(
  commentId: number,
  data: { text?: string },
  requestingUser: RequestingUser
) {
  await getEditableComment(commentId, requestingUser);
  return await commentRepository.updateComment(commentId, data);
}

export async function deleteComment(commentId: number, requestingUser: RequestingUser) {
  await getEditableComment(commentId, requestingUser);
  return await commentRepository.removeComment(commentId);
}
