import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  expenseId: string;
  category: string;
  description: string;
  amount: number;
  baseAmount: number;
  gst: number;
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
  vendor: string;
  paymentMethod: string;
  site: string;
  expenseType: 'operational' | 'office' | 'other';
  receiptUrl?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  expenseId: {
    type: String,
    required: true,
    unique: true,
    default: () => `EXP-${Math.floor(100 + Math.random() * 900)}-${Date.now().toString().slice(-4)}`
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  gst: {
    type: Number,
    required: true,
    default: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  vendor: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Credit Card', 'UPI', 'Cash', 'Cheque', 'Online Payment'],
    required: true
  },
  site: {
    type: String,
    required: true
  },
  expenseType: {
    type: String,
    enum: ['operational', 'office', 'other'],
    required: true
  },
  receiptUrl: {
    type: String
  },
  notes: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
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

// Pre-save middleware to calculate amount
ExpenseSchema.pre('save', function(next) {
  this.amount = this.baseAmount + this.gst;
  next();
});

// Indexes for better query performance
ExpenseSchema.index({ expenseId: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ expenseType: 1 });
ExpenseSchema.index({ site: 1 });
ExpenseSchema.index({ date: 1 });
ExpenseSchema.index({ vendor: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);