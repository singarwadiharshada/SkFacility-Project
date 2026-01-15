
const API_URL = `http://${window.location.hostname}:5001/api`;

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
  
  // Timestamps (from backend)
  createdAt?: string;
  updatedAt?: string;
}

class InvoiceService {
  // Helper function for API calls
  private static async fetchApi(endpoint: string, options?: RequestInit) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Get all invoices
  static async getAllInvoices(): Promise<Invoice[]> {
    try {
      const data = await this.fetchApi('/invoices');
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoices');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  // Get invoices by type
  static async getInvoicesByType(type: 'perform' | 'tax'): Promise<Invoice[]> {
    try {
      const data = await this.fetchApi(`/invoices/type/${type}`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoices by type');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching invoices by type:', error);
      throw error;
    }
  }

  // Get invoice by ID
  static async getInvoiceById(id: string): Promise<Invoice> {
    try {
      const data = await this.fetchApi(`/invoices/${id}`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  // Create new invoice
  static async createInvoice(invoice: Invoice): Promise<Invoice> {
    try {
      const data = await this.fetchApi('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice)
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Update invoice
  static async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const data = await this.fetchApi(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update invoice');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  // Mark invoice as paid
  static async markAsPaid(id: string): Promise<Invoice> {
    try {
      const data = await this.fetchApi(`/invoices/${id}/mark-paid`, {
        method: 'PATCH'
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to mark invoice as paid');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      throw error;
    }
  }

  // Delete invoice
  static async deleteInvoice(id: string): Promise<void> {
    try {
      const data = await this.fetchApi(`/invoices/${id}`, {
        method: 'DELETE'
      });
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  // Search invoices
  static async searchInvoices(query: string): Promise<Invoice[]> {
    try {
      const data = await this.fetchApi(`/invoices/search/${encodeURIComponent(query)}`);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to search invoices');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error searching invoices:', error);
      throw error;
    }
  }

  // Get invoice statistics
  static async getInvoiceStats(): Promise<any> {
    try {
      const data = await this.fetchApi('/invoices/stats/summary');
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get invoice stats');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error getting invoice stats:', error);
      throw error;
    }
  }
}

export default InvoiceService;
