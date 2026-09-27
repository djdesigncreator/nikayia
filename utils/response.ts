import { Response } from 'express';

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

export function fail(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({ success: false, data: null, error: { code, message } });
}

export function paginated(res: Response, items: unknown[], nextCursor: string | null) {
  return ok(res, { items, next_cursor: nextCursor });
}
