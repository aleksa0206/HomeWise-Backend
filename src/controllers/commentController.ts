import type { Request, Response, NextFunction } from 'express';
import * as commentService from '../services/commentService';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export async function getAllCommentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = parsePagination(req);
    const { data, total } = await commentService.getAllComments(
      req.user!.householdId,
      Number(req.params.choreId),
      pagination
    );
    res.json({ data, meta: buildPaginationMeta(total, pagination.page, pagination.limit) });
  } catch (err) {
    next(err);
  }
}

export async function createCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const comment = await commentService.createComment(
      { choreId: Number(req.params.choreId), text: req.body.text },
      req.user!
    );
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

export async function updateCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = Number(req.params.commentId);
    const { text } = req.body;
    res.json(await commentService.updateComment(commentId, { text }, req.user!));
  } catch (err) {
    next(err);
  }
}

export async function deleteCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const commentId = Number(req.params.commentId);
    res.json(await commentService.deleteComment(commentId, req.user!));
  } catch (err) {
    next(err);
  }
}
