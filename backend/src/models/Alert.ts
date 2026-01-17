import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  reportedBy: string;
  site: string;
  photos: string[];
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      required: [true, 'Severity is required']
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open'
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      trim: true
    },
    reportedBy: {
      type: String,
      required: [true, 'Reported by is required'],
      trim: true
    },
    site: {
      type: String,
      required: [true, 'Site is required..'],
      trim: true
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: function(arr: string[]) {
          return arr.length <= 5;
        },
        message: 'Maximum 5 photos allowed'
      }
    },
    assignedTo: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for better performance
alertSchema.index({ status: 1, severity: 1, createdAt: -1 });
alertSchema.index({ site: 1 });

const Alert = mongoose.model<IAlert>('Alert', alertSchema);
export default Alert;
