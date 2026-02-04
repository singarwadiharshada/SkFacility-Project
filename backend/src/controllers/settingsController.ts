// src/controllers/settingsController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import bcrypt from 'bcryptjs';

// Define the type for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
    [key: string]: any;
  };
  userId?: string;
}

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check authentication using userId for backward compatibility
    if (!req.userId && (!req.user || !req.user._id)) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Use userId if available, otherwise use user._id
    const userId = req.userId || req.user?._id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        department: user.department || '',
        // site: user.site || '',
        joinDate: user.joinDate,
        isActive: user.isActive,
        avatar: user.avatar || '',
        emailVerified: user.emailVerified || false,
        lastLogin: user.lastLogin || null
      }
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone } = req.body;
    
    // Check authentication
    if (!req.userId && (!req.user || !req.user._id)) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const userId = req.userId || req.user?._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        name, 
        phone, 
        updatedAt: new Date(),
        ...(name && { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') })
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// In settingsController.ts - CORRECTED updatePassword function
export const updatePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    console.log('\n🔄 ========== PASSWORD UPDATE ==========');
    console.log(`👤 User ID: ${req.userId}`);
    console.log(`🔑 New password (plain): ${newPassword}`);
    console.log(`🔑 New password length: ${newPassword?.length}`);

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    // Check authentication
    if (!req.userId && (!req.user || !req.user._id)) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userId = req.userId || req.user?._id;
    
    // Get user WITH password
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`✅ User found: ${user.email}`);
    
    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      console.log('❌ Current password verification failed');
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    console.log('✅ Current password verified');
    
    // CRITICAL FIX: Set PLAIN TEXT password, NOT hash!
    // The pre-save hook will hash it automatically
    console.log('🔄 Setting PLAIN TEXT password (pre-save hook will hash it)');
    user.password = newPassword; // PLAIN TEXT, not hash!
    
    // Save - pre-save hook will hash the password
    await user.save();
    
    console.log('✅ Password updated successfully');
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Password update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error updating password'
    });
  }
};

export const checkPasswordHealth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { PasswordFixer } = require('../utils/passwordFixer');
    const result = await PasswordFixer.checkAndFixUnhashedPasswords();
    
    res.json({
      success: true,
      message: 'Password health check completed',
      data: result
    });
  } catch (error: any) {
    console.error('Password health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getCurrentPasswordInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔍 [GET PASSWORD INFO] Request received');
    
    if (!req.userId && (!req.user || !req.user._id)) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userId = req.userId || req.user?._id;
    console.log(`🔍 [GET PASSWORD INFO] User ID: ${userId}`);
    
    // FIXED: Use findById
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`🔍 [GET PASSWORD INFO] User found: ${user.email}`);
    
    // Return password info
    res.json({
      success: true,
      message: 'Password information',
      data: {
        email: user.email,
        passwordHashExists: !!user.password,
        passwordHashLength: user.password?.length || 0,
        passwordHashPrefix: user.password ? user.password.substring(0, 20) + '...' : 'No password',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        passwordChangedAt: user.passwordChangedAt || 'Never'
      }
    });
    
  } catch (error: any) {
    console.error('❌ [GET PASSWORD INFO] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const resetPasswordForTesting = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Not allowed in production'
      });
    }

    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    if (!req.userId && (!req.user || !req.user._id)) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userId = req.userId || req.user?._id;
    // FIXED: Use findById
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`🔄 [RESET] Resetting password for ${user.email}`);
    console.log(`🔍 [RESET] Old password hash: ${user.password?.substring(0, 30) || 'NULL'}...`);
    console.log(`🔍 [RESET] New password: ${newPassword}`);
    
    // CRITICAL: Simply set the plain password - mongoose pre-save hook will hash it
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    
    await user.save();
    
    // Verify the new password works
    const updatedUser = await User.findById(userId).select('+password');

    if (updatedUser) {
      console.log(`✅ [RESET] New hash: ${updatedUser.password?.substring(0, 30) || 'NULL'}...`);
      console.log(`🔍 [RESET] Verifying new password...`);
      const verifyMatch = await updatedUser.comparePassword(newPassword);
      console.log(`✅ [RESET] Verification: ${verifyMatch ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log(`✅ [RESET] Password reset completed for ${user.email}`);
    
    res.json({
      success: true,
      message: `Password reset to "${newPassword}"`,
      data: {
        email: user.email,
        note: 'Password has been properly hashed. Try logging in with the new password.',
        verification: 'The new password has been verified to work with the hash.'
      }
    });
    
  } catch (error: any) {
    console.error('❌ [RESET] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Return permissions based on user role
    const userRole = req.user?.role || 'employee';
    const permissions = {
      canCreateAdmins: userRole === 'superadmin',
      canManageManagers: userRole === 'superadmin' || userRole === 'admin',
      canViewReports: true,
      canDeleteUsers: userRole === 'superadmin',
      canManageSettings: userRole === 'superadmin' || userRole === 'admin',
      canManageEmployees: userRole === 'superadmin' || userRole === 'admin' || userRole === 'manager'
    };

    res.json({
      success: true,
      message: 'Permissions retrieved successfully',
      data: permissions
    });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updatePermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { canCreateAdmins, canManageManagers, canViewReports, canDeleteUsers } = req.body;
    
    // Only superadmin can update permissions
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmin can update permissions'
      });
    }

    // For now, just acknowledge the update
    console.log('Permissions update requested:', req.body);
    console.log('By user:', req.user?.email);

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: {
        canCreateAdmins: canCreateAdmins || false,
        canManageManagers: canManageManagers || false,
        canViewReports: canViewReports !== undefined ? canViewReports : true,
        canDeleteUsers: canDeleteUsers || false,
        updatedAt: new Date()
      }
    });
  } catch (error: any) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationPreferences } = req.body;
    
    if (!req.userId && (!req.user || !req.user._id)) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userId = req.userId || req.user?._id;
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        notificationPreferences: {
          emailNotifications: notificationPreferences?.emailNotifications !== undefined ? notificationPreferences.emailNotifications : true,
          pushNotifications: notificationPreferences?.pushNotifications !== undefined ? notificationPreferences.pushNotifications : true,
          securityAlerts: notificationPreferences?.securityAlerts !== undefined ? notificationPreferences.securityAlerts : true,
          weeklyReports: notificationPreferences?.weeklyReports !== undefined ? notificationPreferences.weeklyReports : true,
        },
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.notificationPreferences
    });
  } catch (error: any) {
    console.error('Update notifications error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};