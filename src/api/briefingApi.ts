import axios from 'axios';

const API_URL = `http://${window.location.hostname}:5001/api`;

// Define types
interface StaffBriefing {
  _id: string;
  id: string;
  date: string;
  time: string;
  conductedBy: string;
  site: string;
  department: string;
  attendeesCount: number;
  topics: string[];
  keyPoints: string[];
  actionItems: any[];
  attachments: any[];
  notes: string;
  shift: 'morning' | 'evening' | 'night';
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  briefings?: StaffBriefing[];
  total?: number;
  page?: number;
  totalPages?: number;
}

// Briefing API calls
export const briefingApi = {
  // Get all briefings
  getAllBriefings: async (filters: any = {}): Promise<ApiResponse> => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') params.append(key, value.toString());
      });
      
      const response = await axios.get(`${API_URL}/briefings?${params}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching briefings:', error);
      throw error;
    }
  },

  // Get briefing statistics
  getBriefingStats: async (): Promise<ApiResponse> => {
    try {
      const response = await axios.get(`${API_URL}/briefings/stats`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching briefing stats:', error);
      throw error;
    }
  },

  // Create new briefing with debugging
  createBriefing: async (briefingData: any, files: File[] = []): Promise<ApiResponse> => {
    try {
      console.log('=== Frontend: Creating briefing ===');
      console.log('Briefing data:', briefingData);
      console.log('Files:', files.length);
      
      const formData = new FormData();
      
      // Log what we're sending
      console.log('Appending briefing data:', briefingData);
      formData.append('data', JSON.stringify(briefingData));
      
      files.forEach((file, index) => {
        console.log(`Appending file ${index + 1}:`, file.name, file.type, file.size);
        formData.append('attachments', file);
      });
      
      // Log FormData contents
      console.log('FormData contents:');
      for (let pair of (formData as any).entries()) {
        console.log(pair[0], pair[1]);
      }

      const response = await axios.post(`${API_URL}/briefings`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('API response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating briefing:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error config:', error.config?.data);
      throw error;
    }
  },

  // Update action item status
  updateActionItemStatus: async (briefingId: string, actionItemId: string, status: string): Promise<ApiResponse> => {
    try {
      const response = await axios.patch(
        `${API_URL}/briefings/${briefingId}/action-items/${actionItemId}`,
        { status }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating action item statuses:', error);
      throw error;
    }
  },

  // Delete briefing
  deleteBriefing: async (id: string): Promise<ApiResponse> => {
    try {
      const response = await axios.delete(`${API_URL}/briefings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting briefing:', error);
      throw error;
    }
  }
};