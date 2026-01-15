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
  machineModel?: string;
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

export const machineService = {
  // Get all machines
  async getMachines(filters?: {
    search?: string;
    status?: string;
    department?: string;
    location?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FrontendMachine[]> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.department) params.append('department', filters.department);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await axios.get<FrontendMachine[]>(
      `${API_URL}/machines${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data;
  },

  // Get machine by ID
  async getMachineById(id: string): Promise<FrontendMachine> {
    const response = await axios.get<FrontendMachine>(`${API_URL}/machines/${id}`);
    return response.data;
  },

  // Create new machine
  async createMachine(data: CreateMachineDTO): Promise<FrontendMachine> {
    const response = await axios.post<FrontendMachine>(`${API_URL}/machines`, data);
    return response.data;
  },

  // Update machine
  async updateMachine(id: string, data: Partial<CreateMachineDTO>): Promise<FrontendMachine> {
    const response = await axios.put<FrontendMachine>(`${API_URL}/machines/${id}`, data);
    return response.data;
  },

  // Delete machine
  async deleteMachine(id: string): Promise<void> {
    await axios.delete(`${API_URL}/machines/${id}`);
  },

  // Get machine statistics
  async getMachineStats(): Promise<MachineStats> {
    const response = await axios.get<MachineStats>(`${API_URL}/machines/stats`);
    return response.data;
  },

  // Add maintenance record
  async addMaintenanceRecord(machineId: string, record: MaintenanceRecordDTO): Promise<FrontendMachine> {
    const response = await axios.post<FrontendMachine>(
      `${API_URL}/machines/${machineId}/maintenance`,
      record
    );
    return response.data;
  },

  // Search machines
  async searchMachines(query: string): Promise<FrontendMachine[]> {
    const response = await axios.get<FrontendMachine[]>(
      `${API_URL}/machines/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  }
};