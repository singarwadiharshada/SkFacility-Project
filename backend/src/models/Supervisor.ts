import mongoose, { Document, Schema } from "mongoose";

export interface ISupervisor extends Document {
  name: string;
  email: string;
  phone: string;
  department: string;
  site: string;
  employees: number;
  tasks: number;
  assignedProjects: string[];
  reportsTo?: string;
  isActive: boolean;
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supervisorSchema = new Schema<ISupervisor>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      default: "Operations",
      trim: true
    },
    // site: {
    //   type: String,
    //   default: "Mumbai Office",
    //   trim: true
    // },
    employees: {
      type: Number,
      default: 0
    },
    tasks: {
      type: Number,
      default: 0
    },
    assignedProjects: {
      type: [String],
      default: []
    },
    reportsTo: {
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
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        ret.status = doc.isActive ? "active" : "inactive";
        ret._id = ret._id.toString();
        return ret;
      }
    }
  }
);

export const Supervisor = mongoose.model<ISupervisor>("Supervisor", supervisorSchema);
export default Supervisor;