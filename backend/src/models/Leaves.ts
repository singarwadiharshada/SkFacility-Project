import mongoose, { Schema, Document } from 'mongoose';

export interface ILeave extends Document {
  employeeId: string;
  employeeName: string;
  department: string;
  contactNumber: string;
  leaveType: 'annual' | 'sick' | 'casual';
  fromDate: Date;
  toDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedBy: string;
  appliedFor: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema = new Schema({
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'casual'],
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  appliedBy: {
    type: String,
    required: true
  },
  appliedFor: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ILeave>('Leave', LeaveSchema);