import axios, { AxiosInstance, AxiosResponse } from 'axios';

/* =========================
   TYPES
========================= */

export interface WorkQueryProofFile {
  name: string;
  type: 'image' | 'video' | 'document' | 'other';
  url: string;
  public_id: string;
  size: string;
  format?: string;
  bytes?: number;
  uploadDate: string;
}

export interface WorkQuery {
  _id: string;
  queryId: string;
  title: string;
  description: string;
  type: 'service' | 'task';
  serviceId?: string;
  serviceTitle?: string;
  serviceType?: string;
  serviceStaffId?: string;
  serviceStaffName?: string;
  employeeId?: string;
  employeeName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected';
  category: string;
  proofFiles: WorkQueryProofFile[];
  reportedBy: {
    userId: string;
    name: string;
    role: string;
  };
  assignedTo?: {
    userId: string;
    name: string;
    role: string;
  };
  supervisorId: string;
  supervisorName: string;
  superadminResponse?: string;
  responseDate?: string;
  comments: Array<{
    userId: string;
    name: string;
    comment: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  serviceId: string;
  type: string;
  title: string;
  description: string;
  location: string;
  assignedTo: string;
  assignedToName: string;
  status: string;
  schedule: string;
  supervisorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  value: string;
  label: string;
  description: string;
}

export interface Priority {
  value: string;
  label: string;
  description: string;
  color: string;
}

export interface Status {
  value: string;
  label: string;
  description: string;
  color: string;
}

export interface ServiceType {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Statistics {
  total: number;
  statusCounts: {
    pending: number;
    'in-progress': number;
    resolved: number;
    rejected: number;
  };
  serviceTypeCounts: {
    cleaning: number;
    'waste-management': number;
    'parking-management': number;
    security: number;
    maintenance: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  fileStats: {
    totalFiles: number;
    queriesWithFiles: number;
    averageFilesPerQuery: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

/* =========================
   AXIOS SETUP
========================= */
const API_URL = `http://${window.location.hostname}:5001/api`;

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  console.log('🌐 API Request:', {
    method: config.method,
    url: config.url,
    data: config.data,
    headers: config.headers
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        message: error.response.data?.message || 'API Error',
        data: error.response.data
      });
    }
    return Promise.reject({
      status: 0,
      message: 'Network error. Please check your connection.'
    });
  }
);

/* =========================
   API METHODS
========================= */

export const workQueryApi = {
  /* GET all work queries */
  getAllWorkQueries: async (params: {
    supervisorId?: string;
    search?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<WorkQuery[]>> => {
    const response: AxiosResponse<ApiResponse<WorkQuery[]>> =
      await api.get('/work-queries', { params });
    return response.data;
  },

  /* CREATE work query */
  createWorkQuery: async (
    workQueryData: {
      title: string;
      description: string;
      serviceId: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      supervisorId: string;
      supervisorName: string;
      serviceTitle?: string;
      serviceTeam?: string;
    },
    files?: File[]
  ): Promise<ApiResponse<WorkQuery>> => {
    const formData = new FormData();
    
    // Append work query data
    Object.entries(workQueryData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Append files if any
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        formData.append('proofFiles', file);
      });
    }
    
    const response = await api.post('/work-queries', formData);
    return response.data;
  },

  /* GET work query by ID */
  getWorkQueryById: async (id: string): Promise<ApiResponse<WorkQuery>> => {
    const response = await api.get(`/work-queries/${id}`);
    return response.data;
  },

  /* GET work query by queryId */
  getWorkQueryByQueryId: async (queryId: string): Promise<ApiResponse<WorkQuery>> => {
    const response = await api.get(`/work-queries/query/${queryId}`);
    return response.data;
  },

  /* UPDATE work query status */
  updateWorkQueryStatus: async (
    queryId: string,
    status: WorkQuery['status'],
    superadminResponse?: string
  ): Promise<ApiResponse<WorkQuery>> => {
    const response = await api.patch(
      `/work-queries/${queryId}/status`,
      { status, superadminResponse }
    );
    return response.data;
  },

  /* ADD comment to work query */
  addComment: async (
    queryId: string,
    userId: string,
    name: string,
    comment: string
  ): Promise<ApiResponse<WorkQuery>> => {
    const response = await api.post(
      `/work-queries/${queryId}/comments`,
      { userId, name, comment }
    );
    return response.data;
  },

  /* ASSIGN work query */
  assignQuery: async (
    queryId: string,
    userId: string,
    name: string,
    role?: string
  ): Promise<ApiResponse<WorkQuery>> => {
    const response = await api.patch(
      `/work-queries/${queryId}/assign`,
      { userId, name, role }
    );
    return response.data;
  },

  /* GET statistics */
  getStatistics: async (
    supervisorId: string
  ): Promise<ApiResponse<Statistics>> => {
    const response = await api.get('/work-queries/statistics', {
      params: { supervisorId }
    });
    return response.data;
  },

  /* GET categories */
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await api.get('/work-queries/categories');
    return response.data;
  },

  /* GET priorities */
  getPriorities: async (): Promise<ApiResponse<Priority[]>> => {
    const response = await api.get('/work-queries/priorities');
    return response.data;
  },

  /* GET statuses */
  getStatuses: async (): Promise<ApiResponse<Status[]>> => {
    const response = await api.get('/work-queries/statuses');
    return response.data;
  },

  /* GET service types */
  getServiceTypes: async (): Promise<ApiResponse<ServiceType[]>> => {
    const response = await api.get('/work-queries/service-types');
    return response.data;
  },

  /* GET services for supervisor */
  getServicesForSupervisor: async (
    supervisorId: string
  ): Promise<ApiResponse<Service[]>> => {
    const response = await api.get(`/work-queries/supervisor/${supervisorId}/services`);
    return response.data;
  },

  /* GET recent work queries */
  getRecentWorkQueries: async (
    supervisorId: string,
    limit: number = 5
  ): Promise<ApiResponse<WorkQuery[]>> => {
    const response = await api.get('/work-queries/recent', {
      params: { supervisorId, limit }
    });
    return response.data;
  },

  /* ADD files to work query */
  addFilesToWorkQuery: async (
    queryId: string,
    files: File[]
  ): Promise<ApiResponse<WorkQuery>> => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
    });
    
    const response = await api.post(`/work-queries/${queryId}/files`, formData);
    return response.data;
  },

  /* REMOVE files from work query */
  removeFilesFromWorkQuery: async (
    queryId: string,
    filePublicIds: string[]
  ): Promise<ApiResponse<WorkQuery>> => {
    const response = await api.delete(`/work-queries/${queryId}/files`, {
      data: { filePublicIds }
    });
    return response.data;
  },

  /* DELETE work query */
  deleteWorkQuery: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await api.delete(`/work-queries/${id}`);
    return response.data;
  },

  /* HELPER: Format file size */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /* HELPER: Get file icon type */
  getFileIcon: (mimetype: string): string => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
    return 'other';
  },

  /* HELPER: Validate file */
  validateFile: (file: File): boolean => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (file.size > maxSize) return false;
    if (!allowedTypes.includes(file.type)) return false;
    return true;
  },

  /* HELPER: Get file type from mime */
  getFileTypeFromMime: (mimetype: string): 'image' | 'video' | 'document' | 'other' => {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
    return 'other';
  },

  /* HELPER: Download file */
  downloadFile: async (fileUrl: string, fileName: string): Promise<void> => {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /* HELPER: Preview file */
  previewFile: (fileUrl: string): void => {
    window.open(fileUrl, '_blank');
  }
};

/* =========================
   ERROR HELPER
========================= */

export const handleApiError = (error: any): string => {
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  return 'Something went wrong. Please try again.';
};

export default api;