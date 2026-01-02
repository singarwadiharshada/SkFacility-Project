import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryStructure extends Document {
  employeeId: string;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyance: number;
  medicalAllowance: number;
  otherAllowances: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  otherDeductions: number;
  leaveEncashment: number;
  arrears: number;
  esic: number;
  advance: number;
  mlwf: number;
  effectiveFrom: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryStructureSchema: Schema = new Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      ref: 'Employee'
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative']
    },
    hra: {
      type: Number,
      default: 0,
      min: [0, 'HRA cannot be negative']
    },
    da: {
      type: Number,
      default: 0,
      min: [0, 'DA cannot be negative']
    },
    specialAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Special allowance cannot be negative']
    },
    conveyance: {
      type: Number,
      default: 0,
      min: [0, 'Conveyance cannot be negative']
    },
    medicalAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Medical allowance cannot be negative']
    },
    otherAllowances: {
      type: Number,
      default: 0,
      min: [0, 'Other allowances cannot be negative']
    },
    providentFund: {
      type: Number,
      default: 0,
      min: [0, 'Provident fund cannot be negative']
    },
    professionalTax: {
      type: Number,
      default: 0,
      min: [0, 'Professional tax cannot be negative']
    },
    incomeTax: {
      type: Number,
      default: 0,
      min: [0, 'Income tax cannot be negative']
    },
    otherDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Other deductions cannot be negative']
    },
    leaveEncashment: {
      type: Number,
      default: 0,
      min: [0, 'Leave encashment cannot be negative']
    },
    arrears: {
      type: Number,
      default: 0,
      min: [0, 'Arrears cannot be negative']
    },
    esic: {
      type: Number,
      default: 0,
      min: [0, 'ESIC cannot be negative']
    },
    advance: {
      type: Number,
      default: 0,
      min: [0, 'Advance cannot be negative']
    },
    mlwf: {
      type: Number,
      default: 0,
      min: [0, 'MLWF cannot be negative']
    },
    effectiveFrom: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure only one active salary structure per employee
SalaryStructureSchema.index({ employeeId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
SalaryStructureSchema.index({ employeeId: 1 });
SalaryStructureSchema.index({ isActive: 1 });

export default mongoose.model<ISalaryStructure>('SalaryStructure', SalaryStructureSchema);