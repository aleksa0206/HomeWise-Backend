import { prisma } from '../config/prismaClient';

const commentInclude = {
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function findAllComments(
  householdId: number,
  choreId: number,
  pagination: { skip: number; take: number }
) {
  const where = { householdId, choreId };
  const [data, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      include: commentInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.comment.count({ where }),
  ]);
  return { data, total };
}

export async function findCommentById(commentId: number) {
  return await prisma.comment.findUnique({ where: { id: commentId }, include: commentInclude });
}

export async function createComment(data: {
  choreId: number;
  authorId: number;
  householdId: number;
  text: string;
}) {
  return await prisma.comment.create({ data, include: commentInclude });
}

export async function updateComment(commentId: number, data: { text?: string }) {
  return await prisma.comment.update({
    where: { id: commentId },
    data,
    include: commentInclude,
  });
}

export async function removeComment(commentId: number) {
  return await prisma.comment.delete({ where: { id: commentId } });
}
