// models/Roster.ts - Update the interface and schema
import mongoose, { Schema, Document } from "mongoose";

export interface IRoster extends Document {
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  shift: string;
  shiftTiming: string;
  assignedTask: string;
  hours: number;
  remark: string;
  type: "daily" | "weekly" | "fortnightly" | "monthly";
  siteClient: string;
  supervisor: string;
  createdBy: "superadmin" | "admin"; // Add this field
  createdAt: Date;
  updatedAt: Date;
}

const RosterSchema: Schema = new Schema(
  {
    date: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    shift: {
      type: String,
      required: true,
    },
    shiftTiming: {
      type: String,
      required: true,
    },
    assignedTask: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    remark: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["daily", "weekly", "fortnightly", "monthly"],
      required: true,
    },
    siteClient: {
      type: String,
      required: true,
    },
    supervisor: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      enum: ["superadmin", "admin"],
      required: true,
      default: "superadmin",
    },
  },
  {
    timestamps: true,
  }
);

// Create index for efficient querying
RosterSchema.index({ date: 1, employeeId: 1 });
RosterSchema.index({ type: 1, date: 1 });
RosterSchema.index({ createdBy: 1 }); // Add index for createdBy

export default mongoose.model<IRoster>("Roster", RosterSchema);