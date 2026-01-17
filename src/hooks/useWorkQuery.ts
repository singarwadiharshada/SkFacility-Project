import { useState, useCallback, useEffect, useRef } from 'react';
import { workQueryApi, WorkQuery, Service, Statistics, Category, ServiceType, Priority, Status, handleApiError } from '../services/workQueryApi';
import { toast } from 'sonner';

interface UseWorkQueryOptions {
  supervisorId?: string;
  autoFetch?: boolean;
  initialFilters?: {
    search?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
    page?: number;
    limit?: number;
  };
}

export const useWorkQuery = (options: UseWorkQueryOptions = {}) => {
  const { supervisorId, autoFetch = true, initialFilters = {} } = options;
  
  const [workQueries, setWorkQueries] = useState<WorkQuery[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState({
    queries: false,
    services: false,
    statistics: false,
    categories: false,
    serviceTypes: false,
    priorities: false,
    statuses: false,
    creating: false,
    updating: false,
    deleting: false
  });
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Use refs to track
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch work queries
  const fetchWorkQueries = useCallback(async (filters = {}) => {
    if (!supervisorId) {
      console.log('⚠️ No supervisorId provided');
      return;
    }

    setLoading(prev => ({ ...prev, queries: true }));
    setError(null);
    
    try {
      console.log('🔍 Fetching work queries with supervisorId:', supervisorId);
      const response = await workQueryApi.getAllWorkQueries({
        supervisorId,
        page: pagination.page,
        limit: pagination.limit,
        ...initialFilters,
        ...filters
      });
      
      if (response.success && isMounted.current) {
        console.log(`✅ Fetched ${response.data.length} work queries`);
        setWorkQueries(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        const errorMessage = handleApiError(err);
        console.error('❌ Error fetching work queries:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, queries: false }));
      }
    }
  }, [supervisorId, pagination.page, pagination.limit, JSON.stringify(initialFilters)]);

  // Fetch services for supervisor
  const fetchServices = useCallback(async () => {
    if (!supervisorId) {
      console.log('⚠️ No supervisorId provided');
      return;
    }

    setLoading(prev => ({ ...prev, services: true }));
    
    try {
      console.log('🔍 Fetching services for supervisor:', supervisorId);
      const response = await workQueryApi.getServicesForSupervisor(supervisorId);
      if (response.success && isMounted.current) {
        console.log(`✅ Fetched ${response.data.length} services`);
        setServices(response.data);
      }
    } catch (err: any) {
      if (isMounted.current) {
        const errorMessage = handleApiError(err);
        console.error('❌ Error fetching services:', errorMessage);
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, services: false }));
      }
    }
  }, [supervisorId]);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    if (!supervisorId) {
      console.log('⚠️ No supervisorId provided');
      return;
    }

    setLoading(prev => ({ ...prev, statistics: true }));
    
    try {
      console.log('📊 Fetching statistics for supervisor:', supervisorId);
      const response = await workQueryApi.getStatistics(supervisorId);
      if (response.success && isMounted.current) {
        console.log('✅ Fetched statistics');
        setStatistics(response.data);
      }
    } catch (err: any) {
      if (isMounted.current) {
        const errorMessage = handleApiError(err);
        console.error('❌ Error fetching statistics:', errorMessage);
      }
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ ...prev, statistics: false }));
      }
    }
  }, [supervisorId]);

  // Fetch static data (categories, service types, etc.)
  const fetchStaticData = useCallback(async () => {
    console.log('📋 Fetching static data...');
    
    // Set loading states for static data
    setLoading(prev => ({ 
      ...prev, 
      categories: true,
      serviceTypes: true,
      priorities: true,
      statuses: true
    }));
    
    try {
      const [categoriesRes, serviceTypesRes, prioritiesRes, statusesRes] = await Promise.allSettled([
        workQueryApi.getCategories(),
        workQueryApi.getServiceTypes(),
        workQueryApi.getPriorities(),
        workQueryApi.getStatuses()
      ]);
      
      if (isMounted.current) {
        // Handle categories
        if (categoriesRes.status === 'fulfilled' && categoriesRes.value.success) {
          setCategories(categoriesRes.value.data);
          console.log('✅ Fetched categories');
        } else {
          console.error('❌ Failed to fetch categories:', categoriesRes.status === 'rejected' ? categoriesRes.reason : 'API error');
        }
        
        // Handle service types
        if (serviceTypesRes.status === 'fulfilled' && serviceTypesRes.value.success) {
          setServiceTypes(serviceTypesRes.value.data);
          console.log('✅ Fetched service types');
        } else {
          console.error('❌ Failed to fetch service types:', serviceTypesRes.status === 'rejected' ? serviceTypesRes.reason : 'API error');
        }
        
        // Handle priorities
        if (prioritiesRes.status === 'fulfilled' && prioritiesRes.value.success) {
          setPriorities(prioritiesRes.value.data);
          console.log('✅ Fetched priorities');
        } else {
          console.error('❌ Failed to fetch priorities:', prioritiesRes.status === 'rejected' ? prioritiesRes.reason : 'API error');
        }
        
        // Handle statuses
        if (statusesRes.status === 'fulfilled' && statusesRes.value.success) {
          setStatuses(statusesRes.value.data);
          console.log('✅ Fetched statuses');
        } else {
          console.error('❌ Failed to fetch statuses:', statusesRes.status === 'rejected' ? statusesRes.reason : 'API error');
        }
      }
    } catch (error) {
      console.error('❌ Error in fetchStaticData:', error);
    } finally {
      if (isMounted.current) {
        setLoading(prev => ({ 
          ...prev, 
          categories: false,
          serviceTypes: false,
          priorities: false,
          statuses: false
        }));
      }
    }
  }, []);

  // Create work query
  const createWorkQuery = useCallback(async (
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
  ) => {
    setLoading(prev => ({ ...prev, creating: true }));
    
    try {
      console.log('🚀 Creating work query');
      const response = await workQueryApi.createWorkQuery(workQueryData, files);
      
      if (response.success) {
        console.log('✅ Work query created successfully');
        
        // Add new query to state
        setWorkQueries(prev => [response.data, ...prev]);
        
        // Update statistics
        await fetchStatistics();
        
        toast.success('Work query created successfully!');
        return { success: true, data: response.data };
      }
      
      return { success: false, error: response.message };
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to create work query: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(prev => ({ ...prev, creating: false }));
    }
  }, [fetchStatistics]);

  // Delete work query
  const deleteWorkQuery = useCallback(async (queryId: string) => {
    setLoading(prev => ({ ...prev, deleting: true }));
    
    try {
      console.log(`🗑️ Deleting work query: ${queryId}`);
      const response = await workQueryApi.deleteWorkQuery(queryId);
      
      if (response.success) {
        console.log(`✅ Work query deleted successfully`);
        
        // Remove query from state
        setWorkQueries(prev => prev.filter(q => q._id !== queryId));
        
        // Update statistics
        await fetchStatistics();
        
        toast.success('Work query deleted successfully!');
        return { success: true };
      }
      
      return { success: false, error: response.message };
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      toast.error(`Failed to delete work query: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [fetchStatistics]);

  // Auto-fetch on mount - SIMPLIFIED VERSION
  useEffect(() => {
    if (autoFetch && supervisorId && !hasFetched.current) {
      console.log('🔄 Auto-fetching data for supervisor:', supervisorId);
      hasFetched.current = true;
      
      // Fetch dynamic data
      fetchWorkQueries();
      fetchServices();
      fetchStatistics();
      
      // Fetch static data once
      fetchStaticData();
    }
  }, [autoFetch, supervisorId, fetchWorkQueries, fetchServices, fetchStatistics, fetchStaticData]);

  // Return all functions and data
  return {
    // Data
    workQueries,
    services,
    statistics,
    categories,
    serviceTypes,
    priorities,
    statuses,
    
    // Loading states
    loading,
    
    // Errors
    error,
    
    // Pagination
    pagination,
    changePage: (newPage: number) => {
      setPagination(prev => ({ ...prev, page: newPage }));
      // Re-fetch queries when page changes
      if (supervisorId) {
        fetchWorkQueries({ page: newPage });
      }
    },
    changeLimit: (newLimit: number) => {
      setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
      // Re-fetch queries when limit changes
      if (supervisorId) {
        fetchWorkQueries({ limit: newLimit, page: 1 });
      }
    },
    
    // Actions
    fetchWorkQueries: (filters = {}) => fetchWorkQueries(filters),
    fetchServices,
    fetchStatistics,
    fetchCategories: async () => {
      setLoading(prev => ({ ...prev, categories: true }));
      try {
        const res = await workQueryApi.getCategories();
        if (res.success) setCategories(res.data);
      } finally {
        setLoading(prev => ({ ...prev, categories: false }));
      }
    },
    fetchServiceTypes: async () => {
      setLoading(prev => ({ ...prev, serviceTypes: true }));
      try {
        const res = await workQueryApi.getServiceTypes();
        if (res.success) setServiceTypes(res.data);
      } finally {
        setLoading(prev => ({ ...prev, serviceTypes: false }));
      }
    },
    fetchPriorities: async () => {
      setLoading(prev => ({ ...prev, priorities: true }));
      try {
        const res = await workQueryApi.getPriorities();
        if (res.success) setPriorities(res.data);
      } finally {
        setLoading(prev => ({ ...prev, priorities: false }));
      }
    },
    fetchStatuses: async () => {
      setLoading(prev => ({ ...prev, statuses: true }));
      try {
        const res = await workQueryApi.getStatuses();
        if (res.success) setStatuses(res.data);
      } finally {
        setLoading(prev => ({ ...prev, statuses: false }));
      }
    },
    createWorkQuery,
    deleteWorkQuery,
    updateWorkQueryStatus: async (
      queryId: string,
      status: 'pending' | 'in-progress' | 'resolved' | 'rejected',
      superadminResponse?: string
    ) => {
      const res = await workQueryApi.updateWorkQueryStatus(queryId, status, superadminResponse);
      if (res.success) {
        setWorkQueries(prev => prev.map(q => q._id === res.data._id ? res.data : q));
        await fetchStatistics();
        toast.success('Status updated successfully');
      }
      return res;
    },
    
    // Helper functions
    formatFileSize: workQueryApi.formatFileSize,
    getFileIcon: workQueryApi.getFileIcon,
    validateFile: workQueryApi.validateFile,
    getFileTypeFromMime: workQueryApi.getFileTypeFromMime,
    downloadFile: workQueryApi.downloadFile,
    previewFile: workQueryApi.previewFile
  };
};

export type { WorkQuery, Service, Statistics, Category, ServiceType, Priority, Status };