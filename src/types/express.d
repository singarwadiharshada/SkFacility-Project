import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        _id?: string;
        name: string;
        email: string;
        role: string;
        createdBy?: string;
        updatedBy?: string;
        [key: string]: any;
      
       }; }
  }
}
