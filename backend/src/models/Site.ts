import mongoose, { Schema, Document } from 'mongoose';

export interface ISite extends Document {
  // Basic Information
  name: string;
  clientId?: string; // Added this field
  clientName: string;
  location: string;
  areaSqft: number;
  
  // Services
  services: string[];
  
  // Staff Deployment
  staffDeployment: Array<{
    role: string;
    count: number;
  }>;
  
  // Contract Details
  contractValue: number;
  contractEndDate: Date;
  
  // Status
  status: 'active' | 'inactive';
  
  // System Fields
  createdAt: Date;
  updatedAt: Date;
}

const SiteSchema: Schema = new Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true
    },
    clientId: {
      type: String,
      trim: true,
      default: undefined // This helps avoid storing empty strings
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    areaSqft: {
      type: Number,
      required: [true, 'Area is required'],
      min: [1, 'Area must be greater than 0']
    },
    
    // Services
    services: {
      type: [String],
      default: [],
      validate: {
        validator: function(services: string[]) {
          const validServices = [
            'Housekeeping',
            'Security',
            'Parking',
            'Waste Management'
          ];
          return services.every(service => validServices.includes(service));
        },
        message: 'Invalid service type'
      }
    },
    
    // Staff Deployment
    staffDeployment: {
      type: [{
        role: {
          type: String,
          required: true,
          enum: [
            'Manager',
            'Supervisor',
            'Housekeeping Staff',
            'Security Guard',
            'Parking Attendant',
            'Waste Collector'
          ]
        },
        count: {
          type: Number,
          required: true,
          min: [0, 'Staff count cannot be negative']
        }
      }],
      default: []
    },
    
    // Contract Details
    contractValue: {
      type: Number,
      required: [true, 'Contract value is required'],
      min: [0, 'Contract value cannot be negative']
    },
    contractEndDate: {
      type: Date,
      required: [true, 'Contract end date is required']
    },
    
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
SiteSchema.index({ name: 1 });
SiteSchema.index({ clientName: 1 });
SiteSchema.index({ status: 1 });
SiteSchema.index({ contractEndDate: 1 });
SiteSchema.index({ location: 'text' });

// Virtual for total staff count
SiteSchema.virtual('totalStaff').get(function(this: ISite) {
  return this.staffDeployment.reduce((total, item) => total + item.count, 0);
});

export default mongoose.model<ISite>('Site', SiteSchema);