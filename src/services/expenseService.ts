import { Expense } from '../Billing';

const API_URL = 'http://localhost:5001/api';

// API Service for Expenses
export const expenseService = {
  // Get all expenses with filters
  async getExpenses(filters?: {
    expenseType?: 'all' | 'operational' | 'office' | 'other';
    status?: string;
    site?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    
    if (filters?.expenseType && filters.expenseType !== 'all') {
      queryParams.append('expenseType', filters.expenseType);
    }
    
    if (filters?.status) {
      queryParams.append('status', filters.status);
    }
    
    if (filters?.site) {
      queryParams.append('site', filters.site);
    }
    
    if (filters?.search) {
      queryParams.append('search', filters.search);
    }
    
    if (filters?.page) {
      queryParams.append('page', filters.page.toString());
    }
    
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    
    const response = await fetch(`${API_URL}/expenses?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return response.json();
  },

  // Get single expense
  async getExpenseById(id: string) {
    const response = await fetch(`${API_URL}/expenses/${id}`);
    if (!response.ok) throw new Error('Failed to fetch expense');
    return response.json();
  },

  // Create new expense
  async createExpense(expenseData: Partial<Expense>) {
    const response = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData)
    });
    if (!response.ok) throw new Error('Failed to create expense');
    return response.json();
  },

  // Update expense
  async updateExpense(id: string, expenseData: Partial<Expense>) {
    const response = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData)
    });
    if (!response.ok) throw new Error('Failed to update expense');
    return response.json();
  },

  // Delete expense
  async deleteExpense(id: string) {
    const response = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete expense');
    return response.json();
  },

  // Update expense status
  async updateExpenseStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    const response = await fetch(`${API_URL}/expenses/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Failed to update expense status');
    return response.json();
  },

  // Get expense statistics
  async getExpenseStats(period: 'weekly' | 'monthly' = 'monthly') {
    const response = await fetch(`${API_URL}/expenses/stats?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch expense statistics');
    return response.json();
  }
};