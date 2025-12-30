import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "super_admin" | "admin" | "manager" | "supervisor" | "employee";
  firstName?: string;
  lastName?: string;
  name: string;
  department?: string;
  site: string;
  phone?: string;
  isActive: boolean;
  joinDate: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      select: false // ✅ never return password unless explicitly selected
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "manager", "supervisor", "employee"],
      default: "employee"
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    site: {
      type: String,
      default: "Mumbai Office"
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
    },
    lastLogin: {
      type: Date
    }
  },
  {
    timestamps: true, // ✅ createdAt & updatedAt
    toJSON: {
      transform(doc, ret) {
        // Remove sensitive / internal fields
        delete ret.password;
        delete ret.__v;

        // Add derived status
        ret.status = doc.isActive ? "active" : "inactive";

        // Convert ObjectId to string
        ret._id = ret._id.toString();

        return ret;
      }
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// 🔹 Virtual status (optional, internal use)
userSchema.virtual("status").get(function (this: IUser) {
  return this.isActive ? "active" : "inactive";
});

// 🔹 Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// 🔹 Auto-generate name
userSchema.pre("save", function (next) {
  if (this.firstName || this.lastName) {
    this.name = `${this.firstName || ""} ${this.lastName || ""}`.trim();
  } else {
    this.name = this.username;
  }
  next();
});

// 🔹 Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);
