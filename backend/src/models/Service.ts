import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  status: 'operational' | 'maintenance' | 'down';
  assignedTeam: string;
  lastChecked: Date;
  description?: string;
  category?: string;
  uptime?: number;
  responseTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['operational', 'maintenance', 'down'],
    default: 'operational'
  },
  assignedTeam: {
    type: String,
    required: true
  },
  lastChecked: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['api', 'database', 'server', 'application', 'network', 'other'],
    default: 'application'
  },
  uptime: {
    type: Number,
    min: 0,
    max: 100,
    default: 99.9
  },
  responseTime: {
    type: Number,
    min: 0,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
ServiceSchema.index({ status: 1 });
ServiceSchema.index({ category: 1 });
ServiceSchema.index({ assignedTeam: 1 });

export default mongoose.model<IService>('Service', ServiceSchema);