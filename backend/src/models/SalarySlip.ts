import mongoose, { Schema, Document } from 'mongoose';

export interface ISalarySlip extends Document {
  payrollId: mongoose.Types.ObjectId;
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  generatedDate: Date;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaves: number;
  slipNumber: string;
  downloadUrl?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SalarySlipSchema: Schema = new Schema(
  {
    payrollId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Payroll ID is required'],
      ref: 'Payroll'
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      ref: 'Employee'
    },
    month: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format']
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative']
    },
    allowances: {
      type: Number,
      required: [true, 'Allowances are required'],
      min: [0, 'Allowances cannot be negative']
    },
    deductions: {
      type: Number,
      required: [true, 'Deductions are required'],
      min: [0, 'Deductions cannot be negative']
    },
    netSalary: {
      type: Number,
      required: [true, 'Net salary is required'],
      min: [0, 'Net salary cannot be negative']
    },
    generatedDate: {
      type: Date,
      default: Date.now
    },
    presentDays: {
      type: Number,
      default: 0,
      min: [0, 'Present days cannot be negative']
    },
    absentDays: {
      type: Number,
      default: 0,
      min: [0, 'Absent days cannot be negative']
    },
    halfDays: {
      type: Number,
      default: 0,
      min: [0, 'Half days cannot be negative']
    },
    leaves: {
      type: Number,
      default: 0,
      min: [0, 'Leaves cannot be negative']
    },
    slipNumber: {
      type: String,
      required: [true, 'Slip number is required'],
      unique: true
    },
    downloadUrl: {
      type: String
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Generate slip number before saving
SalarySlipSchema.pre('save', async function (next) {
  const salarySlip = this as ISalarySlip;
  
  if (!salarySlip.slipNumber) {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Find the last slip number for this month
    const lastSlip = await mongoose.model('SalarySlip').findOne({
      slipNumber: new RegExp(`^SS/${year}/${month}/`)
    }).sort({ createdAt: -1 });
    
    let sequence = 1;
    if (lastSlip && lastSlip.slipNumber) {
      const matches = lastSlip.slipNumber.match(/SS\/\d{4}\/\d{2}\/(\d+)/);
      if (matches && matches[1]) {
        sequence = parseInt(matches[1]) + 1;
      }
    }
    
    salarySlip.slipNumber = `SS/${year}/${month}/${sequence.toString().padStart(4, '0')}`;
  }
  
  next();
});

// Indexes for better query performance
SalarySlipSchema.index({ slipNumber: 1 }, { unique: true });
SalarySlipSchema.index({ employeeId: 1 });
SalarySlipSchema.index({ month: 1 });
SalarySlipSchema.index({ payrollId: 1 });
SalarySlipSchema.index({ generatedDate: -1 });

export default mongoose.model<ISalarySlip>('SalarySlip', SalarySlipSchema);