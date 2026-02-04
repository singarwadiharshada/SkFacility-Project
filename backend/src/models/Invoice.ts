import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  designation?: string;
  days?: number;
  hours?: number;
}

export interface IInvoice extends Document {
  // Basic invoice info
  id: string;
  invoiceNumber: string;
  voucherNo?: string;
  invoiceType: 'perform' | 'tax';
  status: 'pending' | 'paid' | 'overdue';
  date: string;
  dueDate?: string;
  
  // Added fields for user/role tracking
  createdBy?: string; // 'admin' or 'superadmin'
  userId?: string; // User ID who created the invoice
  sharedWith?: string[]; // Array of user IDs who can view this invoice
  isVisibleToAdmin: boolean; // NEW: Control if admins can see this invoice
  
  // Client info
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  
  // Company info
  companyName?: string;
  companyAddress?: string;
  companyGSTIN?: string;
  companyState?: string;
  companyStateCode?: string;
  companyEmail?: string;
  
  // Consignee info
  consignee?: string;
  consigneeAddress?: string;
  consigneeGSTIN?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  
  // Buyer info
  buyer?: string;
  buyerAddress?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  
  // Order details
  buyerRef?: string;
  dispatchedThrough?: string;
  paymentTerms?: string;
  notes?: string;
  site?: string;
  destination?: string;
  deliveryTerms?: string;
  serviceType?: string;
  
  // Items
  items: IInvoiceItem[];
  
  // Financials
  amount: number;
  subtotal?: number;
  tax: number;
  discount?: number;
  roundUp?: number;
  
  // Tax invoice specific
  managementFeesPercent?: number;
  managementFeesAmount?: number;
  sacCode?: string;
  panNumber?: string;
  gstNumber?: string;
  serviceLocation?: string;
  esicNumber?: string;
  lwfNumber?: string;
  pfNumber?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  
  // Bank details
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountHolder?: string;
  branchAndIFSC?: string;
  
  // Additional fields
  amountInWords?: string;
  footerNote?: string;
  termsConditions?: string;
  authorisedSignatory?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  unit: { type: String },
  designation: { type: String },
  days: { type: Number, min: 0 },
  hours: { type: Number, min: 0 }
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>({
  // Basic invoice info
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  voucherNo: { type: String },
  invoiceType: { 
    type: String, 
    required: true, 
    enum: ['perform', 'tax'],
    default: 'perform'
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  date: { type: String, required: true },
  dueDate: { type: String },
  
  // User/Role tracking
  createdBy: { type: String, enum: ['admin', 'superadmin'], default: 'superadmin' },
  userId: { type: String },
  sharedWith: [{ type: String }],
  isVisibleToAdmin: { 
    type: Boolean, 
    default: true,
    required: true 
  },
  
  // Client info
  client: { type: String, required: true },
  clientEmail: { type: String },
  clientAddress: { type: String },
  
  // Company info
  companyName: { type: String, default: 'S K Enterprises' },
  companyAddress: { type: String },
  companyGSTIN: { type: String },
  companyState: { type: String },
  companyStateCode: { type: String },
  companyEmail: { type: String },
  
  // Consignee info
  consignee: { type: String },
  consigneeAddress: { type: String },
  consigneeGSTIN: { type: String },
  consigneeState: { type: String },
  consigneeStateCode: { type: String },
  
  // Buyer info
  buyer: { type: String },
  buyerAddress: { type: String },
  buyerGSTIN: { type: String },
  buyerState: { type: String },
  buyerStateCode: { type: String },
  
  // Order details
  buyerRef: { type: String },
  dispatchedThrough: { type: String },
  paymentTerms: { type: String },
  notes: { type: String },
  site: { type: String },
  destination: { type: String },
  deliveryTerms: { type: String },
  serviceType: { type: String },
  
  // Items
  items: { type: [InvoiceItemSchema], required: true, validate: {
    validator: function(items: IInvoiceItem[]) {
      return items.length > 0;
    },
    message: 'At least one item is required'
  }},
  
  // Financials
  amount: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, min: 0 },
  tax: { type: Number, required: true, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  roundUp: { type: Number },
  
  // Tax invoice specific
  managementFeesPercent: { type: Number, min: 0, max: 100 },
  managementFeesAmount: { type: Number, min: 0 },
  sacCode: { type: String },
  panNumber: { type: String },
  gstNumber: { type: String },
  serviceLocation: { type: String },
  esicNumber: { type: String },
  lwfNumber: { type: String },
  pfNumber: { type: String },
  servicePeriodFrom: { type: String },
  servicePeriodTo: { type: String },
  
  // Bank details
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  branch: { type: String },
  accountHolder: { type: String },
  branchAndIFSC: { type: String },
  
  // Additional fields
  amountInWords: { type: String },
  footerNote: { type: String },
  termsConditions: { type: String },
  authorisedSignatory: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-calculate amount before saving
InvoiceSchema.pre('save', function(next) {
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  }
  
  // Calculate tax if not provided (18% for perform, 18% for tax after management fees)
  if (this.invoiceType === 'perform' && !this.tax && this.subtotal) {
    this.tax = this.subtotal * 0.18;
  }
  
  // Calculate total amount
  if (this.subtotal && this.tax !== undefined) {
    this.amount = this.subtotal + this.tax;
    
    // Add management fees for tax invoices
    if (this.invoiceType === 'tax' && this.managementFeesAmount) {
      this.amount += this.managementFeesAmount;
    }
    
    // Add round up if exists
    if (this.roundUp) {
      this.amount += this.roundUp;
    }
  }
  
  // Set default dates
  if (!this.date) {
    this.date = formatDate(new Date().toISOString());
  }
  
  if (!this.dueDate && this.date) {
    // Add 30 days to invoice date for due date
    this.dueDate = calculateDueDate(this.date, 30);
  }
  
  // NEW: Auto-set visibility based on creator
  if (!this.isVisibleToAdmin && this.createdBy === 'superadmin') {
    // Keep as is (superadmin might have explicitly set it to false)
  } else if (this.createdBy === 'superadmin') {
    // Default superadmin invoices to NOT visible to admins
    this.isVisibleToAdmin = false;
  } else if (this.createdBy === 'admin') {
    // Default admin invoices to visible to admins
    this.isVisibleToAdmin = true;
  }
  
  next();
});

// Add static method for querying invoices by user
InvoiceSchema.statics.findByUser = async function(
  userId: string, 
  userRole: string,
  filters: any = {}
) {
  const query: any = { ...filters };
  
  if (userRole === 'admin') {
    // Admin can only see:
    // 1. Invoices created by admins that are visible to admins
    // 2. AND that they created themselves
    query.$and = [
      { createdBy: 'admin' },
      { userId: userId },
      { isVisibleToAdmin: true }
    ];
  }
  // For superadmin, no restriction - they see everything
  
  return await this.find(query).sort({ createdAt: -1 });
};

// Add method to check if a user can view this invoice
InvoiceSchema.methods.canUserView = function(userId: string, userRole: string) {
  if (userRole === 'superadmin') {
    return true; // Superadmins can view everything
  }
  
  if (userRole === 'admin') {
    return (
      this.createdBy === 'admin' &&
      this.userId === userId &&
      this.isVisibleToAdmin === true
    );
  }
  
  return false;
};

// Helper functions
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      if (dateString.match(/\d{2}-[A-Za-z]{3}-\d{2}/)) {
        return dateString;
      }
      return dateString;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString;
  }
}

function calculateDueDate(dateString: string, daysToAdd: number): string {
  try {
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(dateParts[0]);
      const monthIndex = months.indexOf(dateParts[1]);
      const year = parseInt('20' + dateParts[2]);
      
      if (!isNaN(day) && monthIndex >= 0 && !isNaN(year)) {
        const invoiceDate = new Date(year, monthIndex, day);
        invoiceDate.setDate(invoiceDate.getDate() + daysToAdd);
        
        const dueDay = invoiceDate.getDate().toString().padStart(2, '0');
        const dueMonth = months[invoiceDate.getMonth()];
        const dueYear = invoiceDate.getFullYear().toString().slice(-2);
        return `${dueDay}-${dueMonth}-${dueYear}`;
      }
    }
    return dateString;
  } catch (error) {
    return dateString;
  }
}

// Add type for static methods
interface InvoiceModel extends mongoose.Model<IInvoice> {
  findByUser(userId: string, userRole: string, filters?: any): Promise<IInvoice[]>;
}

const Invoice = mongoose.model<IInvoice, InvoiceModel>('Invoice', InvoiceSchema);
export default Invoice;