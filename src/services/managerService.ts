// services/managerService.ts

// Types
export interface Manager {
  _id: string;
  managerId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: 'active' | 'inactive' | 'suspended';
  site: string;
  salary?: number;
  reportsTo?: string; // Higher manager or admin email
  isActive: boolean;
  joinDate: string;
  employees: number;
  tasks: number;
  createdAt?: string;
  updatedAt?: string;
  assignedSupervisors?: string[]; // Array of supervisor IDs
}

export interface CreateManagerRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  department: string;
  position?: string;
  site: string;
  status?: 'active' | 'inactive' | 'suspended';
  salary?: number;
  reportsTo?: string;
}

export interface UpdateManagerRequest {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  site?: string;
  status?: 'active' | 'inactive' | 'suspended';
  salary?: number;
  reportsTo?: string;
  isActive?: boolean;
  assignedSupervisors?: string[];
}

export interface ManagerStats {
  totalManagers: number;
  activeManagers: number;
  inactiveManagers: number;
  suspendedManagers: number;
  totalEmployees: number;
  totalTasks: number;
  departmentStats?: {
    department: string;
    count: number;
    active: number;
  }[];
  siteStats?: {
    site: string;
    count: number;
    active: number;
  }[];
  monthlyStats?: {
    month: string;
    newManagers: number;
    activeManagers: number;
  }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ManagerResponse {
  success: boolean;
  data: Manager[];
  message?: string;
}

const API_URL = `http://${window.location.hostname}:5001/api`;

class ManagerService {
  // Cache implementation
  private cache: Record<string, { data: any; timestamp: number; ttl: number }> = {
    managers: { data: null, timestamp: 0, ttl: 5 * 60 * 1000 }, // 5 minutes
    managerStats: { data: null, timestamp: 0, ttl: 2 * 60 * 1000 }, // 2 minutes
    activeManagers: { data: null, timestamp: 0, ttl: 3 * 60 * 1000 } // 3 minutes
  };

  private abortControllers: Map<string, AbortController> = new Map();

  // Helper method to create cache key
  private createCacheKey(endpoint: string, params?: Record<string, any>): string {
    const key = endpoint + (params ? JSON.stringify(params) : '');
    return btoa(key); // Base64 encode to ensure valid cache key
  }

  // Helper method to get from cache
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache[key];
    if (cached && cached.data && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log(`Using cached data for ${key}`);
      return cached.data;
    }
    return null;
  }

  // Helper method to set cache
  private setCache(key: string, data: any, ttl?: number): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.cache[key]?.ttl || 60 * 1000
    };
  }

  // Helper method to clear cache
  clearCache(key?: string): void {
    if (key) {
      this.cache[key] = { data: null, timestamp: 0, ttl: 0 };
    } else {
      Object.keys(this.cache).forEach(k => {
        this.cache[k] = { data: null, timestamp: 0, ttl: 0 };
      });
    }
  }

  // Helper method to abort previous requests
  private abortPreviousRequest(key: string): void {
    if (this.abortControllers.has(key)) {
      this.abortControllers.get(key)?.abort();
      this.abortControllers.delete(key);
    }
  }

  // Enhanced fetch method with comprehensive error handling
  private async fetchWithCache<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey: string,
    ttl: number,
    params?: Record<string, any>
  ): Promise<T | null> {
    // Check cache first
    const cachedData = this.getFromCache<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Abort previous request for this cache key
    this.abortPreviousRequest(cacheKey);

    // Create new abort controller
    const abortController = new AbortController();
    this.abortControllers.set(cacheKey, abortController);

    try {
      // Build URL with params
      const urlParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            urlParams.append(key, String(value));
          }
        });
      }
      
      // Add cache-busting timestamp if not already in params
      if (!params?._t) {
        urlParams.append('_t', Date.now().toString());
      }

      const queryString = urlParams.toString();
      const url = `${API_URL}/${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      console.log(`Fetching from: ${url}`);

      // Add timeout to the fetch request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
      });

      const fetchPromise = fetch(url, {
        ...options,
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          ...options.headers
        },
        credentials: 'same-origin'
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Check for network errors
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch (textError) {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      // Parse response
      let data: T;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error(`Failed to parse JSON response from ${endpoint}:`, parseError);
        throw new Error('Invalid JSON response from server');
      }

      // Only cache successful responses with data
      if (data && (data as any).success !== false) {
        this.setCache(cacheKey, data, ttl);
      }

      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted:', endpoint);
        return null;
      }
      
      // Handle specific error types
      if (error.message === 'Failed to fetch') {
        console.error(`Network error: Cannot connect to backend at ${API_URL}. Please ensure the server is running on port 5001.`);
        throw new Error(`Cannot connect to server. Please ensure backend is running on port 5001.`);
      }
      
      if (error.message === 'Request timeout') {
        console.error(`Timeout error: Request to ${endpoint} timed out after 10 seconds`);
        throw new Error('Request timeout. Please check your network connection.');
      }
      
      console.error(`Error fetching ${endpoint}:`, error.message || error);
      
      // For non-critical endpoints (stats, exports), return null instead of throwing
      if (endpoint.includes('stats') || endpoint.includes('export')) {
        return null;
      }
      
      throw error;
    } finally {
      this.abortControllers.delete(cacheKey);
    }
  }

  // Health check method
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  // Get all managers with optional filters
  async getAllManagers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    department?: string;
    site?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<PaginatedResponse<Manager>> {
    try {
      // First check if backend is healthy
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        console.warn('Backend is not reachable, returning empty managers list');
        return {
          success: true,
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          message: 'Backend server is not reachable'
        };
      }

      const cacheKey = this.createCacheKey('managers', params);
      const data = await this.fetchWithCache<PaginatedResponse<Manager>>(
        'managers',
        {},
        cacheKey,
        5 * 60 * 1000, // 5 minutes cache
        params
      );

      if (!data) {
        return {
          success: true,
          data: [],
          pagination: {
            page: params?.page || 1,
            limit: params?.limit || 10,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching managers:', error);
      return {
        success: true,
        data: [],
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        message: error.message || 'Failed to fetch managers'
      };
    }
  }

  // Get active managers only (for dropdowns, assignments)
  async getActiveManagers(): Promise<ManagerResponse> {
    try {
      const cacheKey = this.createCacheKey('managers/active');
      const data = await this.fetchWithCache<ManagerResponse>(
        'managers/active',
        {},
        cacheKey,
        3 * 60 * 1000 // 3 minutes cache
      );

      if (!data) {
        return {
          success: true,
          data: []
        };
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching active managers:', error);
      return {
        success: true,
        data: [],
        message: error.message || 'Failed to fetch active managers'
      };
    }
  }

  // Get manager by ID
  async getManagerById(id: string): Promise<ApiResponse<Manager>> {
    try {
      const response = await fetch(`${API_URL}/managers/${id}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Error fetching manager ${id}:`, error);
      throw error;
    }
  }

  // Create new manager
  async createManager(managerData: CreateManagerRequest): Promise<ApiResponse<Manager>> {
    try {
      const response = await fetch(`${API_URL}/managers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify(managerData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear managers cache since data has changed
      this.clearCache('managers');
      this.clearCache('managerStats');
      this.clearCache('activeManagers');

      return data;
    } catch (error: any) {
      console.error('Error creating manager:', error);
      throw error;
    }
  }

  // Update manager
  async updateManager(id: string, managerData: UpdateManagerRequest): Promise<ApiResponse<Manager>> {
    try {
      const response = await fetch(`${API_URL}/managers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify(managerData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear managers cache since data has changed
      this.clearCache('managers');
      this.clearCache('managerStats');
      this.clearCache('activeManagers');

      return data;
    } catch (error: any) {
      console.error(`Error updating manager ${id}:`, error);
      throw error;
    }
  }

  // Delete manager
  async deleteManager(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_URL}/managers/${id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear managers cache since data has changed
      this.clearCache('managers');
      this.clearCache('managerStats');
      this.clearCache('activeManagers');

      return data;
    } catch (error: any) {
      console.error(`Error deleting manager ${id}:`, error);
      throw error;
    }
  }

  // Toggle manager status (active/inactive)
  async toggleManagerStatus(id: string): Promise<ApiResponse<Manager>> {
    try {
      const response = await fetch(`${API_URL}/managers/${id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear managers cache since data has changed
      this.clearCache('managers');
      this.clearCache('managerStats');
      this.clearCache('activeManagers');

      return data;
    } catch (error: any) {
      console.error(`Error toggling manager ${id} status:`, error);
      throw error;
    }
  }

  // Get manager statistics
  async getManagerStats(params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
    site?: string;
  }): Promise<ApiResponse<ManagerStats>> {
    try {
      console.log('Fetching manager stats with params:', params);
      
      // Check backend health first
      const isHealthy = await this.checkBackendHealth();
      if (!isHealthy) {
        console.warn('Backend not reachable for stats, returning empty stats');
        return {
          success: true,
          data: {
            totalManagers: 0,
            activeManagers: 0,
            inactiveManagers: 0,
            suspendedManagers: 0,
            totalEmployees: 0,
            totalTasks: 0
          },
          message: 'Backend server is not reachable'
        };
      }

      const cacheKey = this.createCacheKey('managers/stats', params);
      const data = await this.fetchWithCache<ApiResponse<ManagerStats>>(
        'managers/stats',
        {},
        cacheKey,
        2 * 60 * 1000, // 2 minutes cache
        params
      );

      if (!data) {
        console.log('No data returned for stats, using empty stats');
        return {
          success: true,
          data: {
            totalManagers: 0,
            activeManagers: 0,
            inactiveManagers: 0,
            suspendedManagers: 0,
            totalEmployees: 0,
            totalTasks: 0
          }
        };
      }

      console.log('Successfully fetched manager stats:', data);
      return data;
    } catch (error: any) {
      console.error('Error fetching manager stats:', error);
      return {
        success: true,
        data: {
          totalManagers: 0,
          activeManagers: 0,
          inactiveManagers: 0,
          suspendedManagers: 0,
          totalEmployees: 0,
          totalTasks: 0
        },
        message: error.message || 'Failed to fetch manager stats'
      };
    }
  }

  // Get managers by department
  async getManagersByDepartment(department: string): Promise<ManagerResponse> {
    try {
      const response = await fetch(`${API_URL}/managers/department/${department}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Error fetching managers by department ${department}:`, error);
      throw error;
    }
  }

  // Get managers by site
  async getManagersBySite(site: string): Promise<ManagerResponse> {
    try {
      const response = await fetch(`${API_URL}/managers/site/${site}?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Error fetching managers by site ${site}:`, error);
      throw error;
    }
  }

  // Assign supervisor to manager
  async assignSupervisorToManager(managerId: string, supervisorId: string): Promise<ApiResponse<Manager>> {
    try {
      const response = await fetch(`${API_URL}/managers/${managerId}/assign-supervisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ supervisorId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear managers cache since data has changed
      this.clearCache('managers');
      this.clearCache('activeManagers');

      return data;
    } catch (error: any) {
      console.error(`Error assigning supervisor to manager ${managerId}:`, error);
      throw error;
    }
  }

  // Remove supervisor from manager
  async removeSupervisorFromManager(managerId: string, supervisorId: string): Promise<ApiResponse<Manager>> {
    try {
      const response = await fetch(`${API_URL}/managers/${managerId}/remove-supervisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ supervisorId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Clear managers cache since data has changed
      this.clearCache('managers');
      this.clearCache('activeManagers');

      return data;
    } catch (error: any) {
      console.error(`Error removing supervisor from manager ${managerId}:`, error);
      throw error;
    }
  }

  // Get supervisors assigned to a manager
  async getManagerSupervisors(managerId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_URL}/managers/${managerId}/supervisors?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Error fetching supervisors for manager ${managerId}:`, error);
      throw error;
    }
  }

  // Export managers data
  async exportManagers(params?: {
    format?: 'csv' | 'excel' | 'pdf';
    startDate?: string;
    endDate?: string;
    status?: string;
    department?: string;
  }): Promise<Blob> {
    try {
      const urlParams = new URLSearchParams({
        format: params?.format || 'csv',
        ...params
      });

      const response = await fetch(`${API_URL}/managers/export?${urlParams}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Error exporting managers:', error);
      throw error;
    }
  }

  // Utility methods
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      active: 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800',
      inactive: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800',
      suspended: 'bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  // Transform MongoDB data to frontend format
  transformManagerData(mongoData: any): Manager {
    return {
      _id: mongoData._id || mongoData.id,
      managerId: mongoData.managerId || `MGR${(mongoData._id || mongoData.id).toString().slice(-6)}`,
      name: mongoData.name,
      email: mongoData.email,
      phone: mongoData.phone,
      department: mongoData.department || 'Operations',
      position: mongoData.position || 'Manager',
      status: mongoData.status || 'active',
      site: mongoData.site || 'Mumbai Office',
      salary: mongoData.salary || 0,
      reportsTo: mongoData.reportsTo,
      isActive: mongoData.isActive !== undefined ? mongoData.isActive : true,
      joinDate: mongoData.joinDate || new Date().toISOString(),
      employees: mongoData.employees || 0,
      tasks: mongoData.tasks || 0,
      assignedSupervisors: mongoData.assignedSupervisors || [],
      createdAt: mongoData.createdAt,
      updatedAt: mongoData.updatedAt
    };
  }

  // Helper to check if API is reachable
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get available sites (for dropdowns)
  getAvailableSites(): string[] {
    return ['Mumbai Office', 'Delhi Branch', 'Bangalore Tech Park', 'Chennai Center', 'Hyderabad Campus'];
  }

  // Get available departments (for dropdowns)
  getAvailableDepartments(): string[] {
    return ['Operations', 'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Admin'];
  }

  // Get manager name by email
  getManagerNameByEmail(managers: Manager[], email: string): string {
    const manager = managers.find(m => m.email === email);
    return manager ? manager.name : email;
  }

  // Filter managers with available capacity (less than 10 supervisors assigned)
  getManagersWithCapacity(managers: Manager[]): Manager[] {
    return managers.filter(manager => 
      manager.isActive && 
      (!manager.assignedSupervisors || manager.assignedSupervisors.length < 10)
    );
  }
}

export const managerService = new ManagerService();
export default managerService;