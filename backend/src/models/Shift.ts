import mongoose, { Schema, Document } from 'mongoose';

export interface IShift extends Document {
  name: string;
  startTime: string;
  endTime: string;
  employees: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Shift name is required'],
      trim: true,
      minlength: [2, 'Shift name must be at least 2 characters'],
      maxlength: [50, 'Shift name cannot exceed 50 characters']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:mm format']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please use HH:mm format']
    },
    employees: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

// Validate that end time is after start time
ShiftSchema.pre('save', function (next) {
  const shift = this as IShift;
  
  if (shift.startTime && shift.endTime) {
    const start = new Date(`2000-01-01T${shift.startTime}:00`);
    const end = new Date(`2000-01-01T${shift.endTime}:00`);
    
    if (end <= start) {
      const err = new Error('End time must be after start time');
      return next(err);
    }
  }
  
  next();
});

// Remove duplicate employees from array
ShiftSchema.pre('save', function (next) {
  const shift = this as IShift;
  
  if (shift.employees && Array.isArray(shift.employees)) {
    shift.employees = [...new Set(shift.employees)];
  }
  
  next();
});

export default mongoose.model<IShift>('Shift', ShiftSchema);
