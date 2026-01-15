import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { auth } from '../middleware/auth';

const router = express.Router();

// Signup route
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    console.log('📝 SIGNUP ATTEMPT:', { 
      name, 
      email, 
      role,
      passwordLength: password?.length 
    });

    // Validate required fields
    if (!name || !email || !password || !role) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if user already exists by email
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      console.log('❌ Email already in use:', email);
      return res.status(409).json({ // 409 Conflict
        success: false,
        message: 'Email address is already registered. Please use a different email or try logging in.'
      });
    }

    // Check if username already exists (optional)
    const username = email.split('@')[0];
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      console.log('❌ Username already taken:', username);
      // Generate alternative username
      const alternativeUsername = `${username}${Date.now().toString().slice(-4)}`;
      console.log('💡 Suggested alternative username:', alternativeUsername);
    }

    // For signup, only allow superadmin role
    if (role !== 'superadmin') {
      console.log('❌ Invalid role for signup:', role);
      return res.status(403).json({
        success: false,
        message: 'Only Super Admin can sign up directly. Other roles must be created by an administrator.'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    console.log('✅ All validations passed, creating user...');

    // Create new user with plain password - will be hashed by pre-save hook
    const newUser = new User({
      name,
      email,
      password, // Plain password - will be hashed by the pre-save hook
      role: 'superadmin', // Force superadmin role for signup
      username: email.split('@')[0],
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || '',
      isActive: true,
      site: 'Mumbai Office',
      joinDate: new Date()
    });

    await newUser.save();
    console.log('✅ User created successfully:', newUser.email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // User response without password
    const userResponse = {
      _id: newUser._id.toString(),
      id: newUser._id.toString().slice(-6),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      joinDate: newUser.joinDate.toISOString().split('T')[0]
    };

    console.log('✅ Signup completed for:', userResponse.email);

    res.status(201).json({
      success: true,
      message: 'Super Admin account created successfully!',
      user: userResponse,
      token
    });
  } catch (error: any) {
    console.error('🔥 SIGNUP ERROR:', error);
    
    // Handle duplicate key errors (MongoDB unique constraint)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      
      let message = 'This email is already registered.';
      if (field === 'username') {
        message = 'This username is already taken.';
      }
      
      return res.status(409).json({
        success: false,
        message
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during signup'
    });
  }
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    console.log('Login attempt for:', { email, role });

    // Validate required fields
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', { email: user.email, role: user.role, isActive: user.isActive });

    // Verify password using the comparePassword method
    const isValidPassword = await user.comparePassword(password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact administrator.'
      });
    }

    // Verify role
    if (user.role !== role) {
      console.log('Role mismatch:', { expected: role, actual: user.role });
      return res.status(403).json({
        success: false,
        message: `You are registered as ${user.role}, not ${role}`
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // User response without password
    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    console.log('Login successful for user:', userResponse.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error logging in'
    });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    // This is a simplified version - in production, you'd use JWT token
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = {
      _id: user._id.toString(),
      id: user._id.toString().slice(-6),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      joinDate: user.joinDate.toISOString().split('T')[0]
    };

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Verify token
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        userId: decoded.userId,
        role: decoded.role
      }
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Get user statistics (admin only)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching stats'
    });
  }
});

// Create default admin (for initial setup)
router.post('/create-default-admin', async (req: Request, res: Response) => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    const admin = new User({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'superadmin',
      username: 'admin',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      site: 'Mumbai Office',
      joinDate: new Date()
    });

    await admin.save();

    // Generate token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Default admin created successfully',
      user: {
        _id: admin._id.toString(),
        id: admin._id.toString().slice(-6),
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      token
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating admin'
    });
  }
});
// Get current user (manager) info
router.get('/current-user', auth, async (req, res) => {
  try {
    // Return the user from the auth middleware
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Error in /current-user route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user data' 
    });
  }
});

export default router;