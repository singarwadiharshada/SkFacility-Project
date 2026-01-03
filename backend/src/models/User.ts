import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  username: string;
  firstName: string;
  lastName: string;
  department?: string;
  site: string;
  phone?: string;
  isActive: boolean;
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema({
  name: {
    type: String,
    required: false, // Make it optional since we'll auto-generate it
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
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
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: 'General'
  },
  site: {
    type: String,
    default: 'Mumbai Office'
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Auto-generate name from firstName and lastName if not provided
UserSchema.pre('save', function(next) {
  if (!this.name) {
    if (this.firstName || this.lastName) {
      this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
    } else if (this.username) {
      this.name = this.username;
    } else {
      this.name = this.email.split('@')[0];
    }
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password when converting to JSON
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

export const User = mongoose.model<IUser>("User", UserSchema);
export default User; // ✅ Add this line for default export