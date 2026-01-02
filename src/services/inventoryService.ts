// src/services/inventoryService.ts
const API_BASE_URL = "http://localhost:5001/api";

// InventoryItem Interface - matches backend model
export interface InventoryItem {
  _id: string;
  sku: string;
  name: string;
  department: string;
  category: string;
  site: string;
  assignedManager: string;
  quantity: number;
  price: number;
  costPrice: number;
  supplier: string;
  reorderLevel: number;
  description?: string;
  brushCount?: number;
  squeegeeCount?: number;
  changeHistory: Array<{
    date: string;
    change: string;
    user: string;
    quantity: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Helper interface for frontend compatibility
export interface FrontendInventoryItem extends Omit<InventoryItem, '_id'> {
  id: string;
}

// Inventory Stats Interface
export interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  itemsByDepartment?: Array<{
    _id: string;
    count: number;
    totalValue: number;
  }>;
  topCategories?: Array<{
    _id: string;
    count: number;
  }>;
  recentItems?: InventoryItem[];
  averageQuantity?: number;
}

// API Response Interface
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Helper function to convert backend item to frontend item
const convertToFrontendItem = (item: InventoryItem): FrontendInventoryItem => {
  return {
    ...item,
    id: item._id
  };
};

// Main Inventory Service Class
class InventoryService {
  // Private helper for API calls
  private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ========== ITEM METHODS ==========

  // Get all items with optional filters
  async getItems(params?: {
    search?: string;
    department?: string;
    category?: string;
    site?: string;
    page?: number;
    limit?: number;
  }): Promise<FrontendInventoryItem[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.department && params.department !== 'all') {
        queryParams.append('department', params.department);
      }
      if (params?.category && params.category !== 'all') {
        queryParams.append('category', params.category);
      }
      if (params?.site && params.site !== 'all') {
        queryParams.append('site', params.site);
      }
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.fetchAPI<ApiResponse<InventoryItem[]>>(endpoint);
      
      // Convert backend items to frontend items
      const frontendItems = (response.data || []).map(item => convertToFrontendItem(item));
      return frontendItems;
    } catch (error) {
      console.error('Failed to fetch items:', error);
      return [];
    }
  }

  // Get single item by ID
  async getItem(id: string): Promise<FrontendInventoryItem | null> {
    try {
      const response = await this.fetchAPI<ApiResponse<InventoryItem>>(`/inventory/${id}`);
      
      if (response.data) {
        return convertToFrontendItem(response.data);
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch item ${id}:`, error);
      return null;
    }
  }

  // Create new item
  async createItem(itemData: Omit<FrontendInventoryItem, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<FrontendInventoryItem> {
    try {
      // Convert to backend format (remove id if present)
      const { id, ...backendItem } = itemData as any;
      
      const response = await this.fetchAPI<ApiResponse<InventoryItem>>('/inventory', {
        method: 'POST',
        body: JSON.stringify(backendItem),
      });
      
      return convertToFrontendItem(response.data);
    } catch (error: any) {
      console.error('Failed to create item:', error);
      throw new Error(error.message || 'Failed to create item');
    }
  }

  // Update existing item
  async updateItem(id: string, updates: Partial<FrontendInventoryItem>): Promise<FrontendInventoryItem> {
    try {
      // Convert to backend format
      const { _id, ...updateData } = updates as any;
      
      const response = await this.fetchAPI<ApiResponse<InventoryItem>>(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      
      return convertToFrontendItem(response.data);
    } catch (error: any) {
      console.error(`Failed to update item ${id}:`, error);
      throw new Error(error.message || 'Failed to update item');
    }
  }

  // Delete item
  async deleteItem(id: string): Promise<boolean> {
    try {
      const response = await this.fetchAPI<ApiResponse<{ id: string }>>(`/inventory/${id}`, {
        method: 'DELETE',
      });
      return response.success;
    } catch (error) {
      console.error(`Failed to delete item ${id}:`, error);
      return false;
    }
  }

  // ========== STATISTICS ==========

  // Get inventory statistics
  async getStats(): Promise<InventoryStats> {
    try {
      const response = await this.fetchAPI<ApiResponse<InventoryStats>>('/inventory/stats');
      
      if (response.data) {
        return {
          totalItems: response.data.totalItems || 0,
          lowStockItems: response.data.lowStockItems || 0,
          totalValue: response.data.totalValue || 0,
          itemsByDepartment: response.data.itemsByDepartment,
          topCategories: response.data.topCategories,
          recentItems: response.data.recentItems,
          averageQuantity: response.data.averageQuantity
        };
      }
      
      // Return default stats if no data
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0
      };
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Return default stats
      return {
        totalItems: 0,
        lowStockItems: 0,
        totalValue: 0
      };
    }
  }

  // Get low stock items
  async getLowStockItems(): Promise<FrontendInventoryItem[]> {
    try {
      const response = await this.fetchAPI<ApiResponse<InventoryItem[]>>('/inventory/low-stock');
      
      // Convert backend items to frontend items
      const frontendItems = (response.data || []).map(item => convertToFrontendItem(item));
      return frontendItems;
    } catch (error) {
      console.error('Failed to fetch low stock items:', error);
      return [];
    }
  }

  // ========== BULK OPERATIONS ==========

  // Import items from CSV/JSON
  async importItems(items: FrontendInventoryItem[]): Promise<{ imported: number; failed: number; errors?: string[] }> {
    try {
      // Convert to backend format
      const backendItems = items.map(item => {
        const { id, ...rest } = item;
        return rest;
      });
      
      const response = await this.fetchAPI<ApiResponse<{ imported: number; failed: number; errors?: string[] }>>('/inventory/import', {
        method: 'POST',
        body: JSON.stringify(backendItems),
      });
      
      return response.data || { imported: 0, failed: 0 };
    } catch (error: any) {
      console.error('Failed to import items:', error);
      throw new Error(error.message || 'Failed to import items');
    }
  }

  // Import items from CSV file
  async importItemsFromFile(file: File): Promise<{ imported: number; failed: number; errors?: string[] }> {
    try {
      // Read the CSV file
      const text = await file.text();
      const lines = text.split('\n');
      
      // Parse CSV (simple implementation)
      const items: Partial<FrontendInventoryItem>[] = [];
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const item: any = {};
        
        headers.forEach((header, index) => {
          if (header && values[index]) {
            // Convert numeric fields
            if (['quantity', 'price', 'costPrice', 'reorderLevel', 'brushCount', 'squeegeeCount'].includes(header)) {
              item[header] = parseFloat(values[index]) || 0;
            } else {
              item[header] = values[index];
            }
          }
        });
        
        items.push(item);
      }
      
      // Send to backend
      return await this.importItems(items as FrontendInventoryItem[]);
    } catch (error: any) {
      console.error('Failed to parse CSV file:', error);
      throw new Error('Invalid CSV file format');
    }
  }

  // ========== HELPER METHODS ==========

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Check if item is low stock
  isLowStock(item: FrontendInventoryItem): boolean {
    return item.quantity <= item.reorderLevel;
  }

  // Calculate item value
  calculateItemValue(item: FrontendInventoryItem): number {
    return item.quantity * item.costPrice;
  }

  // Calculate total value for a list of items
  calculateTotalValue(items: FrontendInventoryItem[]): number {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.costPrice);
    }, 0);
  }

  // Generate next SKU (optional helper)
  generateNextSKU(lastSKU: string): string {
    const match = lastSKU.match(/(\D+)(\d+)/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2]) + 1;
      return `${prefix}${number.toString().padStart(3, '0')}`;
    }
    return 'INV-001';
  }

  // Validate item data
  validateItem(item: Partial<FrontendInventoryItem>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required fields
    const requiredFields = ['sku', 'name', 'department', 'category', 'site', 'assignedManager', 'quantity', 'price', 'costPrice', 'supplier', 'reorderLevel'];
    requiredFields.forEach(field => {
      if (!item[field as keyof FrontendInventoryItem]) {
        errors.push(`${field} is required`);
      }
    });

    // Numeric validation
    if (item.quantity !== undefined && item.quantity < 0) {
      errors.push('Quantity cannot be negative');
    }
    
    if (item.price !== undefined && item.price < 0) {
      errors.push('Price cannot be negative');
    }
    
    if (item.costPrice !== undefined && item.costPrice < 0) {
      errors.push('Cost price cannot be negative');
    }
    
    if (item.reorderLevel !== undefined && item.reorderLevel < 0) {
      errors.push('Reorder level cannot be negative');
    }

    // SKU format validation
    if (item.sku && !item.sku.match(/^[A-Z0-9\-]+$/)) {
      errors.push('SKU can only contain uppercase letters, numbers, and hyphens');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Format date
  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Export items to CSV
  exportToCSV(items: FrontendInventoryItem[]): string {
    if (items.length === 0) return '';
    
    const headers = [
      'SKU', 'Name', 'Department', 'Category', 'Site', 'Assigned Manager',
      'Quantity', 'Price', 'Cost Price', 'Supplier', 'Reorder Level',
      'Description', 'Brush Count', 'Squeegee Count'
    ];
    
    const rows = items.map(item => [
      item.sku,
      `"${item.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
      item.department,
      item.category,
      item.site,
      item.assignedManager,
      item.quantity.toString(),
      item.price.toString(),
      item.costPrice.toString(),
      item.supplier,
      item.reorderLevel.toString(),
      item.description ? `"${item.description.replace(/"/g, '""')}"` : '',
      item.brushCount?.toString() || '',
      item.squeegeeCount?.toString() || ''
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Create and export a singleton instance
export const inventoryService = new InventoryService();

// Also export the class if needed elsewhere
export { InventoryService };