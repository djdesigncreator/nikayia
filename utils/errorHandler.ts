import { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      data: null,
      error: { code: err.code, message: err.message },
    });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({
    success: false,
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado.' },
  });
}
