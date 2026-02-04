import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  totalHours: number;
  breakTime: number;
  status: 'present' | 'absent' | 'half-day' | 'leave';
  isCheckedIn: boolean;
  isOnBreak: boolean;
  department: string;
  supervisorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      trim: true,
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      trim: true,
      index: true,
    },
    checkInTime: {
      type: String,
      required: [true, 'Check-in time is required'],
    },
    checkOutTime: {
      type: String,
      default: null,
    },
    breakStartTime: {
      type: String,
      default: null,
    },
    breakEndTime: {
      type: String,
      default: null,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    breakTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'leave'],
      default: 'present',
    },
    isCheckedIn: {
      type: Boolean,
      default: false,
    },
    isOnBreak: {
      type: Boolean,
      default: false,
    },
    supervisorId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: Document, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create compound index for efficient queries
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ createdAt: -1 });

const Attendance: Model<IAttendance> = mongoose.model<IAttendance>('Attendance', attendanceSchema);

export default Attendance;

