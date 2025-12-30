import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { authMiddleware } from '../middleware/auth';
import { IUser } from '../models/User';

const router = express.Router();

interface AuthRequest extends Request {
  user?: IUser;
}
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
// Get all users
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is super admin
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find().sort({ createdAt: -1 });
    
    // Transform users for frontend
    const transformedUsers = users.map(user => ({
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));

    // Group users by role
    const groupedByRole = transformedUsers.reduce((acc: any, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {});

    res.json({
      allUsers: transformedUsers,
      groupedByRole,
      total: transformedUsers.length
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create new user
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { 
      username, 
      email, 
      password, 
      role, 
      firstName, 
      lastName,
      department,
      site,
      phone,
      joinDate
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'supervisor', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const newUser = new User({
      username,
      email,
      password,
      role,
      firstName,
      lastName,
      department,
      site: site || 'Mumbai Office',
      phone,
      joinDate: joinDate ? new Date(joinDate) : new Date()
    });

    await newUser.save();

    const userResponse = {
      _id: newUser._id.toString(),
      id: newUser._id.toString().slice(-6),
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      department: newUser.department,
      site: newUser.site,
      phone: newUser.phone,
      isActive: newUser.isActive,
      status: newUser.isActive ? 'active' as const : 'inactive' as const,
      joinDate: newUser.joinDate.toISOString().split('T')[0]
    };

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update user
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = req.body;
    
    // Don't allow updating sensitive fields directly
    delete updates.password;
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // If name is provided, split into firstName and lastName
    if (updates.name) {
      const [firstName, ...lastNameParts] = updates.name.split(' ');
      updates.firstName = firstName;
      updates.lastName = lastNameParts.join(' ');
      delete updates.name;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update user role
router.put('/:id/role', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { role } = req.body;
    const validRoles = ['admin', 'manager', 'supervisor', 'employee'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.json({
      message: 'User role updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get user statistics
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle user status
router.patch('/:id/toggle-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      username: user.username,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      site: user.site,
      phone: user.phone,
      isActive: user.isActive,
      status: user.isActive ? 'active' as const : 'inactive' as const,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.json({
      message: 'User status updated successfully',
      user: userResponse
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;