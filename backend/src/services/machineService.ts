import axios from 'axios';

const API_URL = `http://${window.location.hostname}:5001/api`;


export interface FrontendMachine {
  _id: string;             // ✅ MongoDB ID
  id?: string;             // optional UI convenience
  name: string;
  cost: number;
  purchaseDate: string;
  quantity: number;
  description?: string;
  status: 'operational' | 'maintenance' | 'out-of-service';
  machineModel?: string;   // ✅ matches backend
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
  machineModel?: string; // ✅ updated
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  manufacturer?: string;
  serialNumber?: string;
  department?: string;
  assignedTo?: string;
}

export interface MaintenanceRecordDTO {
  type: string;
  description: string;
  cost: number;
  performedBy: string;
}

export const machineService = {
  async getMachines(): Promise<FrontendMachine[]> {
    const response = await axios.get<FrontendMachine[]>(`${API_URL}/machines`);
    return response.data.map(m => ({ ...m, id: m._id })); // map _id -> id
  },

  async getMachineById(id: string): Promise<FrontendMachine> {
    const response = await axios.get<FrontendMachine>(`${API_URL}/machines/${id}`);
    return { ...response.data, id: response.data._id };
  },

  async createMachine(data: CreateMachineDTO): Promise<FrontendMachine> {
    const response = await axios.post<FrontendMachine>(`${API_URL}/machines`, data);
    return { ...response.data, id: response.data._id };
  },

  async updateMachine(id: string, data: Partial<CreateMachineDTO>): Promise<FrontendMachine> {
    const response = await axios.put<FrontendMachine>(`${API_URL}/machines/${id}`, data);
    return { ...response.data, id: response.data._id };
  },

  async deleteMachine(id: string): Promise<void> {
    await axios.delete(`${API_URL}/machines/${id}`);
  },

  async addMaintenanceRecord(machineId: string, record: MaintenanceRecordDTO): Promise<FrontendMachine> {
    const response = await axios.post<FrontendMachine>(`${API_URL}/machines/${machineId}/maintenance`, record);
    return { ...response.data, id: response.data._id };
  },
};
