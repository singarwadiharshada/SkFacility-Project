import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
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
      };
    }
  }
}

// Simplified auth middleware for development
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For development, always create a mock user
    req.user = {
      id: 'system',
      _id: 'system',
      name: 'System User',
      email: 'system@example.com',
      role: 'admin',
      createdBy: 'system',
      updatedBy: 'system'
    };
    
    console.log(`Auth middleware passed for ${req.method} ${req.path}`);
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    
    // Even on error, create a mock user for development
    req.user = {
      id: 'system',
      _id: 'system',
      name: 'System User',
      email: 'system@example.com',
      role: 'admin',
      createdBy: 'system',
      updatedBy: 'system'
    };
    next();
  }
};

// Role-based middleware (optional)
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};