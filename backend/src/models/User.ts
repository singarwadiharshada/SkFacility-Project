import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'superadmin' | 'admin' | 'manager' | 'supervisor' | 'employee';
  username: string;
  firstName: string;
  lastName: string;
  department: string;
  //site: string;
  phone: string;
  isActive: boolean;
  joinDate: Date;
  createdBy?: mongoose.Types.ObjectId;
  
  avatar?: string;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;
  notificationPreferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
  };
  permissions?: Record<string, boolean>;
  
  createdAt: Date;
  updatedAt: Date;
  
  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordChangedAfter(JWTTimestamp: number): boolean;
}

const UserSchema = new Schema({
  name: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    required: true,
    enum: ['superadmin', 'admin', 'manager', 'supervisor', 'employee'],
    default: 'employee'
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  // site: {
  //   type: String,
  //   default: 'Mumbai Office'
  // },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  avatar: {
    type: String,
    default: ''
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: true }
  },
  permissions: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Update the interface to include new static methods
interface UserModel extends mongoose.Model<IUser> {
  isValidPasswordHash(password: string): boolean;
  superadminExists(): Promise<boolean>;
  getSuperadmin(): Promise<IUser | null>;
}

// ============ ADD THIS: SINGLE SUPERADMIN CONSTRAINT ============
// This middleware prevents creating more than one superadmin
UserSchema.pre('save', async function(next) {
  const user: any = this;
  
  // Only check if role is being set to superadmin
  if (user.isModified('role') && user.role === 'superadmin') {
    try {
      console.log(`👑 [SUPERADMIN CHECK] Checking superadmin limit for: ${user.email || 'new user'}`);
      
      const query: any = { role: 'superadmin' };
      
      // If this is an existing user being updated, exclude them from the check
      if (user._id) {
        query._id = { $ne: user._id };
        console.log(`👑 [SUPERADMIN CHECK] Excluding user ID: ${user._id}`);
      }
      
      const existingSuperadmin = await mongoose.model('User').findOne(query);
      
      if (existingSuperadmin) {
        console.log(`❌ [SUPERADMIN CHECK] Superadmin already exists: ${existingSuperadmin.email}`);
        const error = new Error('Only one superadmin is allowed in the system');
        error.name = 'SuperadminLimitError';
        return next(error);
      }
      
      console.log(`✅ [SUPERADMIN CHECK] No existing superadmin found, allowing creation`);
    } catch (error: any) {
      console.error('❌ [SUPERADMIN CHECK] Error:', error);
      return next(error);
    }
  }
  next();
});

// Also add middleware for findOneAndUpdate operations (for direct updates)
UserSchema.pre('findOneAndUpdate', async function(next) {
  const update: any = this.getUpdate();
  
  // Check if role is being set to superadmin
  const roleUpdate = update.$set?.role || update.role;
  
  if (roleUpdate === 'superadmin') {
    try {
      console.log(`👑 [FINDONEANDUPDATE] Checking superadmin limit for update`);
      
      const existingSuperadmin = await mongoose.model('User').findOne({
        role: 'superadmin',
        _id: { $ne: this.getQuery()._id }
      });
      
      if (existingSuperadmin) {
        console.log(`❌ [FINDONEANDUPDATE] Superadmin already exists: ${existingSuperadmin.email}`);
        const error = new Error('Only one superadmin is allowed in the system');
        error.name = 'SuperadminLimitError';
        return next(error);
      }
      
      console.log(`✅ [FINDONEANDUPDATE] No existing superadmin found, allowing update`);
    } catch (error: any) {
      console.error('❌ [FINDONEANDUPDATE] Error:', error);
      return next(error);
    }
  }
  next();
});

// Add a static method to check if superadmin exists
UserSchema.statics.superadminExists = async function(): Promise<boolean> {
  const superadmin = await this.findOne({ role: 'superadmin' });
  return !!superadmin;
};

// Add a static method to get the superadmin
UserSchema.statics.getSuperadmin = async function() {
  return await this.findOne({ role: 'superadmin' }).select('-password');
};


// Auto-generate name from firstName and lastName
UserSchema.pre('save', function(next) {
  if (!this.name && (this.firstName || this.lastName)) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  next();
});

// Hash password before saving - FIXED with proper type casting
UserSchema.pre('save', async function(next) {
  // FIXED: Use 'this' directly without type casting, or cast to 'any'
  const user: any = this;
  
  console.log(`\n🔐 [PRE-SAVE] Starting for user: ${user.email || 'new user'}`);
  console.log(`🔐 [PRE-SAVE] Is new user? ${user.isNew}`);
  console.log(`🔐 [PRE-SAVE] Password modified? ${user.isModified('password')}`);
  
  // Only run this function if password was actually modified
  if (!user.isModified('password')) {
    console.log('🔐 [PRE-SAVE] Password not modified, skipping');
    return next();
  }
  
  try {
    // Debug what we received
    console.log(`🔐 [PRE-SAVE] Password value received: ${user.password ? 'SET' : 'NULL'}`);
    if (user.password) {
      console.log(`🔐 [PRE-SAVE] Password length: ${user.password.length}`);
      console.log(`🔐 [PRE-SAVE] Looks like hash? ${user.password.startsWith('$2') ? 'YES' : 'NO'}`);
      console.log(`🔐 [PRE-SAVE] Preview: ${user.password.substring(0, 30)}...`);
    }
    
    // CRITICAL FIX: If password is already hashed, it means the calling code
    // is sending a hash instead of plain text. This is a BUG in the calling code!
    if (user.password && user.password.startsWith('$2')) {
      console.error(`❌❌❌ CRITICAL BUG DETECTED!`);
      console.error(`❌❌❌ Calling code is sending HASHED password instead of PLAIN TEXT!`);
      console.error(`❌❌❌ This will cause login to fail!`);
      
      // Store as-is with warning
      console.warn(`⚠️ Storing hash as-is. Login WILL FAIL unless fixed!`);
      user.passwordChangedAt = new Date();
      return next();
    }
    
    // Normal flow: hash the plain text password
    console.log('🔐 [PRE-SAVE] Generating salt...');
    const salt = await bcrypt.genSalt(12);
    console.log('🔐 [PRE-SAVE] Hashing password...');
    user.password = await bcrypt.hash(user.password, salt);
    user.passwordChangedAt = new Date();
    
    console.log(`🔐 [PRE-SAVE] Password hashed successfully`);
    console.log(`🔐 [PRE-SAVE] New hash: ${user.password.substring(0, 30)}...`);
    console.log(`🔐 [PRE-SAVE] Hash length: ${user.password.length}`);
    
    next();
  } catch (error: any) {
    console.error('❌ [PRE-SAVE] Password hashing error:', error);
    next(error);
  }
});

// Method to compare password - FIXED with proper type casting
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    // FIXED: Use 'this' directly
    const user: any = this;
    
    console.log(`\n🔐 [COMPARE] Starting comparison for: ${user.email}`);
    
    // Check if stored password exists
    if (!user.password) {
      console.error(`❌ [COMPARE] No password stored for user ${user.email}`);
      return false;
    }
    
    console.log(`🔐 [COMPARE] Stored password length: ${user.password.length}`);
    console.log(`🔐 [COMPARE] Is bcrypt hash? ${user.password.startsWith('$2')}`);
    
    // Use bcrypt compare
    const isMatch = await bcrypt.compare(candidatePassword, user.password);
    console.log(`🔐 [COMPARE] Result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    return isMatch;
    
  } catch (error: any) {
    console.error('❌ [COMPARE] Password comparison error:', error.message);
    return false;
  }
};

// Method to check if password was changed after JWT was issued
UserSchema.methods.isPasswordChangedAfter = function(JWTTimestamp: number): boolean {
  const user: any = this;
  if (user.passwordChangedAt) {
    const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Static method to validate password hash
UserSchema.statics.isValidPasswordHash = function(password: string): boolean {
  return !!(password && password.startsWith('$2'));
};

// Add the methods to the schema
interface UserModel extends mongoose.Model<IUser> {
  isValidPasswordHash(password: string): boolean;
}

export const User = mongoose.model<IUser, UserModel>("User", UserSchema);
export default User;