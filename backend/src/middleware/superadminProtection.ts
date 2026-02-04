// src/middleware/superadminProtection.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export const protectSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion or deactivation of the last Super Admin
    if (user.role === 'superadmin' && (req.method === 'DELETE' || (req.method === 'PATCH' && req.body.isActive === false))) {
      const superAdminCount = await User.countDocuments({ 
        role: 'superadmin', 
        isActive: true 
      });

      if (superAdminCount <= 1) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete/deactivate the last Super Admin. At least one active Super Admin is required.'
        });
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error protecting Super Admin'
    });
  }
};

export const checkSuperAdminLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only check for Super Admin role creation
    if (req.body.role === 'superadmin') {
      const superAdminCount = await User.countDocuments({ role: 'superadmin' });
      const MAX_SUPER_ADMINS = 2; // Set your limit here

      if (superAdminCount >= MAX_SUPER_ADMINS) {
        return res.status(403).json({
          success: false,
          message: `Maximum of ${MAX_SUPER_ADMINS} Super Admins allowed`
        });
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking Super Admin limit'
    });
  }
};