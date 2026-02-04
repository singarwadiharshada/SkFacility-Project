// services/alertService.ts - SIMPLIFIED VERSION
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Alert } from '@/types/alert';

// Your working backend URL
const API_URL = process.env.NODE_ENV === 'development' 
  ? `http://localhost:5001/api` 
  : '/api';
  
console.log('🔧 Using alerts backend at:', API_URL);

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 
    'Content-Type': 'application/json' 
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use((config) => {
  console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📥 Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

export const alertService = {
  // Test API connection
  async testConnection(): Promise<any> {
    try {
      console.log('🔍 Testing API connection...');
      // Test the root endpoint of your backend
      const response = await axios.get('http://localhost:5001/');
      console.log('✅ Backend is running:', response.data.message);
      
      // Also test alerts endpoint
      try {
        const alertsResponse = await api.get('/alerts');
        console.log(`✅ Alerts API working (${alertsResponse.data.total} alerts found)`);
      } catch (alertError) {
        console.log('⚠️ Alerts endpoint may not be configured');
      }
      
      return {
        success: true,
        status: 'connected',
        backend: 'SK Enterprises',
        ...response.data
      };
    } catch (error: any) {
      console.error('❌ Cannot connect to backend:', error.message);
      throw error;
    }
  },

  // Get all alerts
  async getAlerts(): Promise<{ success: boolean; data: Alert[]; total: number }> {
    try {
      console.log('📋 Fetching alerts from database...');
      const response = await api.get('/alerts');
      console.log(`✅ Found ${response.data.total} alerts`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching alerts:', error.message);
      throw error;
    }
  },

  // Get alert by ID
  async getAlertById(id: string): Promise<Alert> {
    try {
      const response = await api.get(`/alerts/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error fetching alert ${id}:`, error.message);
      throw error;
    }
  },

  // Create alert
  async createAlert(alertData: any): Promise<Alert> {
    try {
      console.log('➕ Creating alert in database:', alertData);
      
      // Validate minimum requirements before sending
      if (!alertData.description || alertData.description.length < 10) {
        throw new Error('Description must be at least 10 characters long');
      }
      
      if (!alertData.title || alertData.title.length < 3) {
        throw new Error('Title must be at least 3 characters long');
      }
      
      const response = await api.post('/alerts', alertData);
      console.log('✅ Alert saved to database:', response.data.data.id);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error creating alert:', error.message);
      if (error.response?.data) {
        console.error('Validation errors:', error.response.data);
      }
      throw error;
    }
  },

  // Update alert
  async updateAlert(id: string, alertData: any): Promise<Alert> {
    try {
      const response = await api.put(`/alerts/${id}`, alertData);
      console.log('✅ Alert updated in database:', id);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error updating alert ${id}:`, error.message);
      throw error;
    }
  },

  // Update alert status
  async updateAlertStatus(id: string, status: Alert['status']): Promise<Alert> {
    try {
      const response = await api.patch(`/alerts/${id}/status`, { status });
      console.log(`✅ Alert ${id} status updated to:`, status);
      return response.data.data;
    } catch (error: any) {
      console.error(`❌ Error updating alert status ${id}:`, error.message);
      throw error;
    }
  },

  // Delete alert
  async deleteAlert(id: string): Promise<void> {
    try {
      await api.delete(`/alerts/${id}`);
      console.log('✅ Alert deleted from database:', id);
    } catch (error: any) {
      console.error(`❌ Error deleting alert ${id}:`, error.message);
      throw error;
    }
  },

  // Get alert statistics
  async getAlertStats(): Promise<any> {
    try {
      const response = await api.get('/alerts/stats/overview');
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching alert stats :', error.message);
      throw error;
    }
  },

  // Convert file to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};

export default alertService;
