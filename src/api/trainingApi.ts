import axios from 'axios';

const API_URL = `http://${window.location.hostname}:5001/api`;

// Define types matching your backend
interface TrainingSession {
  _id: string;
  id: string;
  title: string;
  description: string;
  type: 'safety' | 'technical' | 'soft_skills' | 'compliance' | 'other';
  date: string;
  time: string;
  duration: string;
  trainer: string;
  supervisor: string;
  site: string;
  department: string;
  attendees: string[];
  maxAttendees: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  attachments: any[];
  feedback: any[];
  location: string;
  objectives: string[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  trainings?: TrainingSession[];
  total?: number;
  page?: number;
  totalPages?: number;
}

// Training API calls
export const trainingApi = {
  // Get all trainings
  getAllTrainings: async (filters: any = {}): Promise<ApiResponse> => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '') params.append(key, value.toString());
      });
      
      const response = await axios.get(`${API_URL}/trainings?${params}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainings:', error);
      throw error;
    }
  },

  // Get training statistics
  getTrainingStats: async (): Promise<ApiResponse> => {
    try {
      const response = await axios.get(`${API_URL}/trainings/stats`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching training stats:', error);
      throw error;
    }
  },

  // Create new training
  // Update createTraining function in trainingApi.ts
createTraining: async (trainingData: any, files: File[] = []): Promise<ApiResponse> => {
  try {
    console.log('Training data to send:', trainingData);
    console.log('Number of files:', files.length);
    
    const formData = new FormData();
    
    // Log each field before appending
    console.log('Appending data:', trainingData);
    formData.append('data', JSON.stringify(trainingData));
    
    files.forEach((file, index) => {
      console.log(`File ${index + 1}:`, file.name, file.type, file.size);
      formData.append('attachments', file);
    });
    
    // Log FormData contents (for debugging)
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    const response = await axios.post(`${API_URL}/trainings`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating training:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', error.response?.headers);
    throw error;
  }
},

  // Update training status
  updateTrainingStatus: async (id: string, status: string): Promise<ApiResponse> => {
    try {
      const response = await axios.patch(`${API_URL}/trainings/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Error updating training status:', error);
      throw error;
    }
  },

  // Delete training
  deleteTraining: async (id: string): Promise<ApiResponse> => {
    try {
      const response = await axios.delete(`${API_URL}/trainings/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting training:', error);
      throw error;
    }
  },

  // Add feedback
  addFeedback: async (trainingId: string, feedback: any): Promise<ApiResponse> => {
    try {
      const response = await axios.post(`${API_URL}/trainings/${trainingId}/feedback`, feedback);
      return response.data;
    } catch (error: any) {
      console.error('Error adding feedbacks:', error);
      throw error;
    }
  }
};