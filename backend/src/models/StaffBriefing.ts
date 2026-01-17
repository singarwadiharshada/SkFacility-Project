import mongoose, { Schema, Document } from 'mongoose';

export interface IActionItem {
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export interface IStaffBriefing extends Document {
  date: Date;
  time: string;
  conductedBy: string;
  site: string;
  department: string;
  attendeesCount: number;
  topics: string[];
  keyPoints: string[];
  actionItems: IActionItem[];
  attachments: any[];
  notes: string;
  shift: 'morning' | 'evening' | 'night';
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema = new Schema({
  description: { type: String, required: true },
  assignedTo: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
});

const StaffBriefingSchema = new Schema({
  date: { type: Date, required: true },
  time: { type: String },
  conductedBy: { type: String, required: true },
  site: { type: String, required: true },
  department: { type: String, required: true },
  attendeesCount: { type: Number, default: 0 },
  topics: [{ type: String }],
  keyPoints: [{ type: String }],
  actionItems: [ActionItemSchema],
  attachments: [{ 
    name: String,
    type: { type: String, enum: ['image', 'document', 'video'] },
    url: String,
    size: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: { type: String },
  shift: { 
    type: String, 
    enum: ['morning', 'evening', 'night'],
    default: 'morning'
  },
  id: { type: String, unique: true }
}, {
  timestamps: true
});

// Auto-generate ID - UPDATED VERSION 
StaffBriefingSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const count = await mongoose.model('StaffBriefing').countDocuments();
    this.id = `BRI${String(count + 1).padStart(3, '0')}`;
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.model<IStaffBriefing>('StaffBriefing', StaffBriefingSchema);