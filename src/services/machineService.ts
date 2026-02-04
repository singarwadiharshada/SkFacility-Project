// src/services/machineService.ts
import axios from 'axios';

const API_URL = `http://${window.location.hostname}:5001/api`;

export interface FrontendMachine {
  id: string;
  _id?: string;
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
  maintenanceHistory?: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
    performedBy: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMachineDTO {
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
}

export interface MachineStats {
  totalMachines: number;
  totalMachineValue: number;
  operationalMachines: number;
  maintenanceMachines: number;
  outOfServiceMachines: number;
  averageMachineCost: number;
  machinesByDepartment: Record<string, number>;
  machinesByLocation: Record<string, number>;
  upcomingMaintenanceCount: number;
}

export interface MaintenanceRecordDTO {
  type: string;
  description: string;
  cost: number;
  performedBy: string;
}

// Helper function to calculate stats locally
const calculateLocalMachineStats = (machines: FrontendMachine[]): MachineStats => {
  const totalMachines = machines.length;
  const totalMachineValue = machines.reduce((sum, machine) => sum + (machine.cost * machine.quantity), 0);
  const operationalMachines = machines.filter(m => m.status === 'operational').length;
  const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
  const outOfServiceMachines = machines.filter(m => m.status === 'out-of-service').length;
  const averageMachineCost = totalMachines > 0 ? totalMachineValue / totalMachines : 0;
  
  // Count machines needing maintenance soon (within next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const today = new Date();
  
  const upcomingMaintenanceCount = machines.filter(machine => {
    if (!machine.nextMaintenanceDate) return false;
    try {
      const nextMaintenanceDate = new Date(machine.nextMaintenanceDate);
      return nextMaintenanceDate <= thirtyDaysFromNow && nextMaintenanceDate >= today;
    } catch (error) {
      console.error('Error parsing maintenance date:', machine.nextMaintenanceDate, error);
      return false;
    }
  }).length;

  // Calculate machines by department
  const machinesByDepartment = machines.reduce((acc, machine) => {
    const dept = machine.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate machines by location
  const machinesByLocation = machines.reduce((acc, machine) => {
    const location = machine.location || 'Unassigned';
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalMachines,
    totalMachineValue,
    operationalMachines,
    maintenanceMachines,
    outOfServiceMachines,
    averageMachineCost,
    machinesByDepartment,
    machinesByLocation,
    upcomingMaintenanceCount
  };
};

// Enhanced axios instance with better error handling
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Machine API Request] ${config.method?.toUpperCase()} ${config.url}`);
      if (config.params) {
        console.log('[Machine API Request Params]', config.params);
      }
      if (config.data) {
        console.log('[Machine API Request Data]', config.data);
      }
    }
    return config;
  },
  (error) => {
    console.error('[Machine API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Machine API Response] ${response.status} ${response.config.url}`);
      if (response.data && Array.isArray(response.data)) {
        console.log(`[Machine API Response Data Count] ${response.data.length} items`);
      }
    }
    return response;
  },
  (error) => {
    // Skip logging for stats endpoint errors
    if (error.config?.url?.includes('/machines/stats')) {
      return Promise.reject(error);
    }
    
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      code: error.code
    };
    
    if (error.response?.status >= 500) {
      console.error('[Machine API Server Error]', errorDetails);
    } else if (error.response?.status >= 400) {
      console.warn('[Machine API Client Error]', errorDetails);
    } else {
      console.error('[Machine API Network Error]', errorDetails);
    }
    
    return Promise.reject(error);
  }
);

export const machineService = {
  // Get all machines with filters - ✅ FIXED with params option
  async getMachines(filters?: {
    search?: string;
    status?: string;
    department?: string;
    location?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    assignedTo?: string;
    [key: string]: any;
  }): Promise<FrontendMachine[]> {
    try {
      // Build query params
      const params: Record<string, any> = {};
      
      // Add all filters to params
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            params[key] = value;
          }
        });
      }
      
      // Add debug logging
      console.log('Fetching machines with filters:', filters);
      console.log('Request params:', params);
      
      // ✅ FIXED: Pass params in the config object
      const response = await api.get<FrontendMachine[]>('/machines', { 
        params 
      });
      
      // Normalize the response - ensure all machines have an id field
      const machines = response.data.map(machine => ({
        ...machine,
        id: machine.id || machine._id || `temp-${Date.now()}-${Math.random()}`
      }));
      
      console.log(`Fetched ${machines.length} machines`);
      
      // Debug: Check if machines belong to the filtered assignedTo
      if (filters?.assignedTo && machines.length > 0) {
        const wrongMachines = machines.filter(machine => machine.assignedTo !== filters.assignedTo);
        if (wrongMachines.length > 0) {
          console.warn(`WARNING: Found ${wrongMachines.length} machines not assigned to ${filters.assignedTo}!`);
        }
      }
      
      return machines;
    } catch (error: any) {
      console.error('Error fetching machines:', error);
      
      // Provide a more helpful error message
      if (error.code === 'ECONNREFUSED') {
        console.error('Backend server is not running. Please start the backend server on port 5001.');
      }
      
      // Return empty array instead of throwing to prevent complete failure
      return [];
    }
  },

  // Get machine by ID
  async getMachineById(id: string): Promise<FrontendMachine> {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid machine ID');
      }
      
      // Try different ID formats if needed
      let response;
      try {
        response = await api.get<FrontendMachine>(`/machines/${id}`);
      } catch (error: any) {
        // If 404 or 500, try with _id parameter
        if (error.response?.status === 404 || error.response?.status === 500) {
          const allMachines = await this.getMachines();
          const foundMachine = allMachines.find(m => 
            m.id === id || 
            m._id === id || 
            (m as any)._id?.toString() === id
          );
          
          if (foundMachine) {
            return foundMachine;
          }
          throw new Error(`Machine not found with ID: ${id}`);
        }
        throw error;
      }
      
      const machine = response.data;
      
      // Ensure the machine has an id field
      if (!machine.id) {
        machine.id = machine._id || id;
      }
      
      return machine;
    } catch (error: any) {
      console.error(`Error fetching machine ${id}:`, error);
      
      // Try to get more specific error message
      let errorMessage = 'Failed to fetch machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = `Machine not found with ID: ${id}`;
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while fetching machine with ID: ${id}. Check backend logs.`;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Create new machine
  async createMachine(data: CreateMachineDTO): Promise<FrontendMachine> {
    try {
      // Ensure required fields are present
      if (!data.name || !data.cost || !data.purchaseDate) {
        throw new Error('Missing required fields: name, cost, purchaseDate');
      }

      // Format the data for backend
      const machineData = {
        name: data.name,
        cost: Number(data.cost),
        purchaseDate: data.purchaseDate,
        quantity: Number(data.quantity) || 1,
        description: data.description || '',
        status: data.status || 'operational',
        location: data.location || '',
        manufacturer: data.manufacturer || '',
        model: data.model || '',
        serialNumber: data.serialNumber || '',
        department: data.department || '',
        assignedTo: data.assignedTo || '',
        lastMaintenanceDate: data.lastMaintenanceDate || undefined,
        nextMaintenanceDate: data.nextMaintenanceDate || undefined,
      };

      const response = await api.post<FrontendMachine>('/machines', machineData);
      
      // Ensure the created machine has an id field
      const createdMachine = response.data;
      if (!createdMachine.id && createdMachine._id) {
        createdMachine.id = createdMachine._id;
      }
      
      return createdMachine;
    } catch (error: any) {
      console.error('Error creating machine:', error);
      
      let errorMessage = 'Failed to create machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Update machine
  async updateMachine(id: string, data: Partial<CreateMachineDTO>): Promise<FrontendMachine> {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid machine ID for update');
      }
      
      const response = await api.put<FrontendMachine>(`/machines/${id}`, data);
      
      // Ensure the updated machine has an id field
      const updatedMachine = response.data;
      if (!updatedMachine.id && updatedMachine._id) {
        updatedMachine.id = updatedMachine._id;
      }
      
      return updatedMachine;
    } catch (error: any) {
      console.error(`Error updating machine ${id}:`, error);
      
      let errorMessage = 'Failed to update machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Delete machine
  async deleteMachine(id: string): Promise<void> {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Invalid machine ID for deletion');
      }
      
      await api.delete(`/machines/${id}`);
    } catch (error: any) {
      console.error(`Error deleting machine ${id}:`, error);
      
      let errorMessage = 'Failed to delete machine';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Get machine statistics - COMPLETELY LOCAL CALCULATION (backend endpoint is broken)
  async getMachineStats(): Promise<MachineStats> {
    // ALWAYS use local calculation since backend /machines/stats endpoint is broken
    
    try {
      const machines = await this.getMachines();
      
      if (machines.length === 0) {
        return {
          totalMachines: 0,
          totalMachineValue: 0,
          operationalMachines: 0,
          maintenanceMachines: 0,
          outOfServiceMachines: 0,
          averageMachineCost: 0,
          machinesByDepartment: {},
          machinesByLocation: {},
          upcomingMaintenanceCount: 0
        };
      }
      
      const localStats = calculateLocalMachineStats(machines);
      console.log('Machine stats calculated locally:', localStats);
      return localStats;
      
    } catch (error) {
      console.error('Failed to calculate local machine stats:', error);
      
      // Return empty stats as fallback
      return {
        totalMachines: 0,
        totalMachineValue: 0,
        operationalMachines: 0,
        maintenanceMachines: 0,
        outOfServiceMachines: 0,
        averageMachineCost: 0,
        machinesByDepartment: {},
        machinesByLocation: {},
        upcomingMaintenanceCount: 0
      };
    }
  },

  // Add maintenance record
  async addMaintenanceRecord(machineId: string, record: MaintenanceRecordDTO): Promise<FrontendMachine> {
    try {
      if (!machineId || machineId === 'undefined') {
        throw new Error('Invalid machine ID for maintenance');
      }
      
      const response = await api.post<FrontendMachine>(
        `/machines/${machineId}/maintenance`,
        record
      );
      
      // Ensure the updated machine has an id field
      const updatedMachine = response.data;
      if (!updatedMachine.id && updatedMachine._id) {
        updatedMachine.id = updatedMachine._id;
      }
      
      return updatedMachine;
    } catch (error: any) {
      console.error(`Error adding maintenance record for machine ${machineId}:`, error);
      
      let errorMessage = 'Failed to add maintenance record';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = `Machine not found with ID: ${machineId}`;
      } else if (error.response?.status === 500) {
        errorMessage = `Server error while adding maintenance. Check backend logs.`;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Search machines
  async searchMachines(query: string): Promise<FrontendMachine[]> {
    try {
      // ✅ FIXED: Pass params in the config object
      const response = await api.get<FrontendMachine[]>(`/machines/search`, {
        params: { q: query }
      });
      
      // Normalize the response
      const machines = response.data.map(machine => ({
        ...machine,
        id: machine.id || machine._id || `temp-${Date.now()}-${Math.random()}`
      }));
      
      return machines;
    } catch (error: any) {
      console.error('Error searching machines:', error);
      return [];
    }
  },

  // Test connection to backend
  async testConnection(): Promise<boolean> {
    try {
      await api.get('/health');
      return true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  },

  // Helper: Get machine from local cache
  getMachineFromCache(machineId: string, machines: FrontendMachine[]): FrontendMachine | undefined {
    return machines.find(m => 
      m.id === machineId || 
      m._id === machineId || 
      (m as any)._id?.toString() === machineId
    );
  },

  // Check if stats endpoint is working (for debugging)
  async checkStatsEndpoint(): Promise<{ working: boolean; error?: string }> {
    try {
      const response = await api.get('/machines/stats');
      return { working: true };
    } catch (error: any) {
      return { 
        working: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  }
};