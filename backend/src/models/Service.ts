// models/Service.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  status: 'operational' | 'maintenance' | 'down';
  assignedTeam: string;
  lastChecked: Date;
  description?: string;
  createdBy: string;
  createdByRole: string;
  createdByUserId?: mongoose.Types.ObjectId;
  updatedBy?: string;
  updatedByRole?: string;
  isVisibleToAll: boolean;
  sharedWithRoles: string[];
  visibility: 'all' | 'specific_roles';
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>({
  name: {
    type: String,
    required: true,
    unique: true
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
  createdBy: {
    type: String,
    required: true
  },
  createdByRole: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'employee'],
    required: true,
    default: 'superadmin'
  },
  createdByUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: String
  },
  updatedByRole: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'employee']
  },
  isVisibleToAll: {
    type: Boolean,
    default: true
  },
  sharedWithRoles: [{
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'employee']
  }],
  visibility: {
    type: String,
    enum: ['all', 'specific_roles'],
    default: 'all'
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

export default mongoose.model<IService>('Service', ServiceSchema);