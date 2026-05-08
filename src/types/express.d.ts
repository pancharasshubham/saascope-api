import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;

       user?: {
        userId: string;
       };
    }
  }
}

export {};
