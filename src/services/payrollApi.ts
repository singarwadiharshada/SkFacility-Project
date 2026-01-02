import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance with cache control headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Requested-With': 'XMLHttpRequest'
  },
});

// Request interceptor for auth and cache busting
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add cache busting for GET requests
    if (config.method?.toLowerCase() === 'get') {
      // Create new params object to avoid mutation
      config.params = {
        ...config.params,
        _: Date.now(), // Timestamp for cache busting
        nocache: true // Additional cache busting parameter
      };
      
      // Ensure headers are set for no-cache
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
    }

    // Log request for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
      headers: config.headers
    });

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`API Response: ${response.status} ${response.config.url}`, {
      data: response.data,
      headers: response.headers
    });

    // Check if response came from cache
    if (response.headers['x-cache'] === 'HIT' || response.status === 304) {
      console.warn('Response may be cached:', response.config.url);
    }

    return response;
  },
  (error) => {
    // Enhanced error logging
    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      message: error.message
    });

    // Handle specific error cases
    if (error.response?.status === 304) {
      console.warn('304 Not Modified - Cached response for:', error.config.url);
      // You can optionally retry with cache busting
      if (error.config.method?.toLowerCase() === 'get') {
        console.log('Retrying request with cache busting...');
        return api({
          ...error.config,
          params: {
            ...error.config.params,
            _: Date.now(),
            force: true
          }
        });
      }
    }

    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    if (error.response?.status === 404) {
      console.error('API Endpoint Not Found:', error.config.url);
    }

    if (error.response?.status === 500) {
      console.error('Server Error for:', error.config.url);
    }

    return Promise.reject(error);
  }
);

// Helper function to create cache-busting params
const getCacheBustingParams = (params: any = {}) => {
  return {
    ...params,
    _: Date.now(),
    nocache: true
  };
};

// Salary Structure API
export const salaryStructureApi = {
  getAll: (params?: any) => 
    api.get('/salary-structures', { 
      params: getCacheBustingParams(params),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log('Salary Structures API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Salary Structures API Error:', error);
      throw error;
    }),
  
  getById: (id: string) => 
    api.get(`/salary-structures/${id}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Salary Structure ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Salary Structure ${id} API Error:`, error);
      throw error;
    }),
  
  getByEmployeeId: (employeeId: string) => 
    api.get(`/salary-structures/employee/${employeeId}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Salary Structure for Employee ${employeeId} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Salary Structure for Employee ${employeeId} API Error:`, error);
      throw error;
    }),
  
  create: (data: any) => 
    api.post('/salary-structures', data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log('Create Salary Structure API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Create Salary Structure API Error:', error);
      throw error;
    }),
  
  update: (id: string, data: any) => 
    api.put(`/salary-structures/${id}`, data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Update Salary Structure ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Update Salary Structure ${id} API Error:`, error);
      throw error;
    }),
  
  delete: (id: string) => 
    api.delete(`/salary-structures/${id}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Delete Salary Structure ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Delete Salary Structure ${id} API Error:`, error);
      throw error;
    }),
  
  deactivate: (id: string) => 
    api.patch(`/salary-structures/${id}/deactivate`, {}, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Deactivate Salary Structure ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Deactivate Salary Structure ${id} API Error:`, error);
      throw error;
    }),
  
  getEmployeesWithoutStructure: (params?: any) => 
    api.get('/salary-structures/employees/without', { 
      params: getCacheBustingParams(params),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log('Employees Without Structure API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Employees Without Structure API Error:', error);
      throw error;
    }),
};

// Payroll API
export const payrollApi = {
  getAll: (params?: any) => 
    api.get('/payroll', { 
      params: getCacheBustingParams(params),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-No-Cache': 'true'
      }
    }).then(res => {
      console.log('Payroll GetAll API Response:', {
        success: res.data.success,
        dataCount: res.data.data?.length,
        summary: res.data.summary
      });
      return res.data;
    }).catch(error => {
      console.error('Payroll GetAll API Error:', error);
      throw error;
    }),
  
  getById: (id: string) => 
    api.get(`/payroll/${id}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Payroll ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Payroll ${id} API Error:`, error);
      throw error;
    }),
  
  getByEmployeeAndMonth: (employeeId: string, month: string) => 
    api.get(`/payroll/${employeeId}/${month}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Payroll for ${employeeId} in ${month} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Payroll for ${employeeId} in ${month} API Error:`, error);
      throw error;
    }),
  
  process: (data: any) => 
    api.post('/payroll/process', data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log('Process Payroll API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Process Payroll API Error:', error);
      throw error;
    }),
  
  bulkProcess: (data: any) => 
    api.post('/payroll/bulk-process', data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log('Bulk Process Payroll API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Bulk Process Payroll API Error:', error);
      throw error;
    }),
  
  updatePaymentStatus: (id: string, data: any) => 
    api.put(`/payroll/${id}/payment-status`, data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Update Payment Status ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Update Payment Status ${id} API Error:`, error);
      throw error;
    }),
  
  delete: (id: string) => 
    api.delete(`/payroll/${id}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Delete Payroll ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Delete Payroll ${id} API Error:`, error);
      throw error;
    }),
  
  getSummary: (params?: any) => 
    api.get('/payroll/summary', { 
      params: getCacheBustingParams(params),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log('Payroll Summary API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Payroll Summary API Error:', error);
      throw error;
    }),
  
  export: (params: any) => 
    api.get('/payroll/export', { 
      params: getCacheBustingParams(params),
      responseType: 'blob',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log('Payroll Export API Response:', {
        status: res.status,
        headers: res.headers,
        dataSize: res.data.size
      });
      return res.data;
    }).catch(error => {
      console.error('Payroll Export API Error:', error);
      throw error;
    }),
};

// Salary Slip API
export const salarySlipApi = {
  getAll: (params?: any) => 
    api.get('/salary-slips', { 
      params: getCacheBustingParams(params),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log('Salary Slips GetAll API Response:', {
        success: res.data.success,
        dataCount: res.data.data?.length
      });
      return res.data;
    }).catch(error => {
      console.error('Salary Slips GetAll API Error:', error);
      throw error;
    }),
  
  getById: (id: string) => 
    api.get(`/salary-slips/${id}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Salary Slip ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Salary Slip ${id} API Error:`, error);
      throw error;
    }),
  
  getBySlipNumber: (slipNumber: string) => 
    api.get(`/salary-slips/slip/${slipNumber}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Salary Slip ${slipNumber} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Salary Slip ${slipNumber} API Error:`, error);
      throw error;
    }),
  
  getByEmployeeAndMonth: (employeeId: string, month: string) => 
    api.get(`/salary-slips/${employeeId}/${month}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Salary Slip for ${employeeId} in ${month} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Salary Slip for ${employeeId} in ${month} API Error:`, error);
      throw error;
    }),
  
  generate: (data: { payrollId: string }) => 
    api.post('/salary-slips', data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log('Generate Salary Slip API Response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Generate Salary Slip API Error:', error);
      throw error;
    }),
  
  update: (id: string, data: any) => 
    api.put(`/salary-slips/${id}`, data, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Update Salary Slip ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Update Salary Slip ${id} API Error:`, error);
      throw error;
    }),
  
  delete: (id: string) => 
    api.delete(`/salary-slips/${id}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Delete Salary Slip ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Delete Salary Slip ${id} API Error:`, error);
      throw error;
    }),
  
  markAsEmailed: (id: string) => 
    api.patch(`/salary-slips/${id}/email`, {}, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).then(res => {
      console.log(`Mark Salary Slip ${id} as Emailed API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Mark Salary Slip ${id} as Emailed API Error:`, error);
      throw error;
    }),
  
  getPrintData: (id: string) => 
    api.get(`/salary-slips/${id}/print`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Salary Slip ${id} Print Data API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Salary Slip ${id} Print Data API Error:`, error);
      throw error;
    }),
};

// Employee API
export const employeeApi = {
  getAll: (params?: any) => 
    api.get('/employees', { 
      params: getCacheBustingParams(params),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log('Employees GetAll API Response:', {
        success: res.data.success,
        dataCount: res.data.data?.length
      });
      return res.data;
    }).catch(error => {
      console.error('Employees GetAll API Error:', error);
      throw error;
    }),
  
  getById: (id: string) => 
    api.get(`/employees/${id}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Employee ${id} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Employee ${id} API Error:`, error);
      throw error;
    }),
  
  getAttendance: (employeeId: string, month: string) => 
    api.get(`/attendance/${employeeId}/${month}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Attendance for ${employeeId} in ${month} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Attendance for ${employeeId} in ${month} API Error:`, error);
      throw error;
    }),
  
  getLeaves: (employeeId: string, month: string) => 
    api.get(`/leaves/${employeeId}/${month}`, {
      params: getCacheBustingParams(),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).then(res => {
      console.log(`Leaves for ${employeeId} in ${month} API Response:`, res.data);
      return res.data;
    }).catch(error => {
      console.error(`Leaves for ${employeeId} in ${month} API Error:`, error);
      throw error;
    }),
};

// Debug utility functions
export const apiDebug = {
  clearCache: () => {
    // Clear any cached data
    console.log('Clearing API cache...');
    localStorage.removeItem('api-cache');
    sessionStorage.removeItem('api-cache');
  },
  
  getCacheStatus: () => {
    console.log('API Cache Status:', {
      localStorage: localStorage.getItem('api-cache') ? 'Has cache' : 'No cache',
      sessionStorage: sessionStorage.getItem('api-cache') ? 'Has cache' : 'No cache'
    });
  },
  
  testConnection: () => {
    return api.get('/health', { params: getCacheBustingParams() })
      .then(res => {
        console.log('API Connection Test:', res.data);
        return res.data;
      })
      .catch(error => {
        console.error('API Connection Test Failed:', error);
        throw error;
      });
  }
};

// Export default with all APIs
export default {
  salaryStructure: salaryStructureApi,
  payroll: payrollApi,
  salarySlip: salarySlipApi,
  employee: employeeApi,
  debug: apiDebug
};