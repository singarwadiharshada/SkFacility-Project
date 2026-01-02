import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  UserStats, 
  UsersResponse,
  UserRole 
} from '@/types/user';

// Use REACT_APP_ prefix for React environment variables
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance with auth interceptor
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if running in browser (not SSR)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        // Create headers object if it doesn't exist
        if (!config.headers) {
          config.headers = {} as any;
        }
        // Add authorization header
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    // Handle other common errors
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data);
    }
    
    if (error.response?.status === 404) {
      console.error('Resource not found:', error.config?.url);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export const userService = {
  // Get all users
  async getAllUsers(): Promise<UsersResponse> {
    try {
      const response = await api.get<UsersResponse>('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get users by role
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const response = await api.get<UsersResponse>('/users');
      return response.data.allUsers.filter(user => user.role === role);
    } catch (error) {
      console.error(`Error fetching users with role ${role}:`, error);
      throw error;
    }
  },

  // Create user
  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Generate username from email if not provided
      if (!userData.username && userData.email) {
        userData.username = userData.email.split('@')[0];
      }

      const response = await api.post<{ user: User; message: string }>('/users', userData);
      return response.data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Update user
  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    try {
      const response = await api.put<{ user: User; message: string }>(`/users/${id}`, userData);
      return response.data.user;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  // Delete user
  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  },

  // Toggle user status
  async toggleUserStatus(id: string): Promise<User> {
    try {
      const response = await api.patch<{ user: User; message: string }>(`/users/${id}/toggle-status`);
      return response.data.user;
    } catch (error) {
      console.error(`Error toggling status for user ${id}:`, error);
      throw error;
    }
  },

  // Update user role
  async updateUserRole(id: string, role: UserRole): Promise<User> {
    try {
      const response = await api.put<{ user: User; message: string }>(`/users/${id}/role`, { role });
      return response.data.user;
    } catch (error) {
      console.error(`Error updating role for user ${id}:`, error);
      throw error;
    }
  },

  // Get user statistics
  async getUserStats(): Promise<UserStats[]> {
    try {
      const response = await api.get<UserStats[]>('/users/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  // Search users
  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await api.get<UsersResponse>('/users');
      const users = response.data.allUsers.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        (user.department && user.department.toLowerCase().includes(query.toLowerCase())) ||
        user.role.toLowerCase().includes(query.toLowerCase())
      );
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  },

  // Get single user by ID
 // Get single user by ID
async getUserById(id: string): Promise<User> {
  try {
    const response = await api.get<{ data: User }>(`/users/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
},

  // Get active users count
  async getActiveUsersCount(): Promise<number> {
    try {
      const response = await api.get<UsersResponse>('/users');
      return response.data.allUsers.filter(user => user.isActive).length;
    } catch (error) {
      console.error('Error fetching active users count:', error);
      throw error;
    }
  }
};

export default userService;