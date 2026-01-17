export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  designation?: string;
  days?: number;
  hours?: number;
}

export interface Invoice {
  // Basic invoice info
  id: string;
  invoiceNumber: string;
  voucherNo?: string;
  invoiceType: 'perform' | 'tax';
  status: 'pending' | 'paid' | 'overdue';
  date: string;
  dueDate?: string;
  
  // User/Role tracking
  createdBy?: string;
  userId?: string;
  sharedWith?: string[];
  
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
  items: InvoiceItem[];
  
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
  
  // Email field (to fix the error)
  email?: string;
}