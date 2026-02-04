import mongoose, { Schema, Document } from 'mongoose';

export interface IHourlyUpdate {
  id: string;
  timestamp: Date;
  content: string;
  submittedBy: string; // User ID
}

export interface IAttachment {
  id: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  size: number;
  type: string;
}

export interface ITask extends Document {
  title: string;
  description: string;
  assignedTo: string; // User ID
  assignedToName: string; // User name for easy reference
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline: Date;
  dueDateTime: Date;
  siteId: string; // Reference to Site
  siteName: string; // For easy reference
  clientName: string; // For easy reference
  taskType?: string;
  attachments: IAttachment[];
  hourlyUpdates: IHourlyUpdate[];
  createdBy: string; // User ID who created the task
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  }
}, { _id: false });

const HourlyUpdateSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  submittedBy: {
    type: String,
    required: true
  }
}, { _id: false });

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Task title must be at least 3 characters']
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
      minlength: [10, 'Task description must be at least 10 characters']
    },
    assignedTo: {
      type: String,
      required: [true, 'Assignee is required'],
      trim: true
    },
    assignedToName: {
      type: String,
      required: [true, 'Assignee name is required'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending',
      required: true
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
      validate: {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid deadline date'
      }
    },
    dueDateTime: {
      type: Date,
      required: [true, 'Due date and time is required'],
      validate: {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid due date and time'
      }
    },
    siteId: {
      type: String,
      required: [true, 'Site ID is required'],
      trim: true
    },
    siteName: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    taskType: {
      type: String,
      enum: ['inspection', 'maintenance', 'training', 'audit', 'emergency', 'routine', 'safety', 'equipment', 'general', 'other'],
      default: 'general'
    },
    attachments: {
      type: [AttachmentSchema],
      default: []
    },
    hourlyUpdates: {
      type: [HourlyUpdateSchema],
      default: []
    },
    createdBy: {
      type: String,
      required: [true, 'Creator ID is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ siteId: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ priority: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ createdAt: -1 });

// Virtual for formatted due date
TaskSchema.virtual('formattedDueDate').get(function(this: ITask) {
  return this.dueDateTime.toLocaleString();
});

// Virtual for formatted deadline
TaskSchema.virtual('formattedDeadline').get(function(this: ITask) {
  return this.deadline.toLocaleDateString();
});

export default mongoose.model<ITask>('Task', TaskSchema);