import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachment {
  name: string;
  type: 'image' | 'document' | 'video';
  url: string;
  size: string;
  uploadedAt: Date;
}

export interface IFeedback {
  employeeId: string;
  employeeName: string;
  rating: number;
  comment: string;
  submittedAt: Date;
}

export interface ITrainingSession extends Document {
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: Date;
  time: string;
  duration: string;
  trainer: string;
  supervisor: string;
  site: string;
  department: string;
  attendees: string[];
  maxAttendees: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attachments: IAttachment[];
  feedback: IFeedback[];
  location: string;
  objectives: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['image', 'document', 'video'], required: true },
  url: { type: String, required: true },
  size: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const FeedbackSchema = new Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

const TrainingSessionSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['safety', 'technical', 'soft_skills', 'compliance', 'other'],
    default: 'safety'
  },
  date: { type: Date, required: true },
  time: { type: String },
  duration: { type: String },
  trainer: { type: String, required: true },
  supervisor: { type: String },
  site: { type: String, required: true },
  department: { type: String, required: true },
  attendees: [{ type: String }],
  maxAttendees: { type: Number, default: 20 },
  status: { 
    type: String, 
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  attachments: [AttachmentSchema],
  feedback: [FeedbackSchema],
  location: { type: String },
  objectives: [{ type: String }]
}, {
  timestamps: true
});

// Auto-generate ID
TrainingSessionSchema.pre('save', async function(next) {
  if (!this.isNew) return next();

  try {
    const count = await mongoose.model('TrainingSession').countDocuments();
    this.id = `TRN${String(count + 1).padStart(3, '0')}`;
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.model<ITrainingSession>('TrainingSession', TrainingSessionSchema);