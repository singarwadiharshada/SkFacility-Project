import { Request, Response } from 'express';
import { workQueryService } from '../services/workQuery.service';

// If you have a facility service service, import it:
// import { facilityServiceService } from '../services/service.service';

// If not, create a mock service
class MockFacilityServiceService {
  async getServicesBySupervisor(supervisorId: string): Promise<any[]> {
    console.log(`🔍 Getting mock services for supervisor: ${supervisorId}`);
    
    // Return mock services data
    return [
      {
        _id: '1',
        serviceId: 'CLEAN001',
        type: 'cleaning',
        title: 'Office Floor Deep Cleaning',
        description: 'Complete deep cleaning of office floor',
        location: 'Floor 3',
        assignedTo: 'STAFF001',
        assignedToName: 'Ramesh Kumar',
        status: 'in-progress',
        schedule: '2024-02-15T09:00:00',
        supervisorId: 'SUP001'
      },
      {
        _id: '2',
        serviceId: 'WASTE001',
        type: 'waste-management',
        title: 'Biomedical Waste Collection',
        description: 'Urgent collection and disposal',
        location: 'Clinic Wing',
        assignedTo: 'STAFF002',
        assignedToName: 'Suresh Patel',
        status: 'pending',
        schedule: '2024-02-15T14:00:00',
        supervisorId: 'SUP001'
      },
      {
        _id: '3',
        serviceId: 'PARK001',
        type: 'parking-management',
        title: 'Parking Lot Management',
        description: 'Parking slot allocation and management',
        location: 'Main Parking Lot',
        assignedTo: 'STAFF003',
        assignedToName: 'Anil Sharma',
        status: 'completed',
        schedule: '2024-02-14T10:00:00',
        supervisorId: 'SUP001'
      }
    ].filter(service => service.supervisorId === supervisorId);
  }
}

// Create instance
const facilityServiceService = new MockFacilityServiceService();

export class WorkQueryController {
  // Create work query for service
async createWorkQuery(req: Request, res: Response) {
  try {
    console.log('📝 Creating work query...');
    console.log('📦 Request body:', req.body);
    
    // Files are already processed by multer middleware
    const files = req.files as Express.Multer.File[];
    console.log('📎 Files received:', files?.length || 0);
    
    // Extract form data from request body
    const {
      title,
      description,
      serviceId,
      priority = 'medium',
      category = 'service-quality',
      supervisorId,
      supervisorName
    } = req.body;

    console.log('✅ Extracted data:', { title, description, serviceId, priority, category, supervisorId, supervisorName });

    // Basic validation
    if (!title || !description || !serviceId || !supervisorId || !supervisorName) {
      console.log('❌ Validation failed');
      return res.status(400).json({
        success: false,
        message: 'Title, description, service ID, supervisor ID, and supervisor name are required'
      });
    }

    // Validate files if provided
    if (files && files.length > 0) {
      const maxFileSize = 25 * 1024 * 1024; // 25MB
      for (const file of files) {
        if (file.size > maxFileSize) {
          return res.status(400).json({
            success: false,
            message: `File ${file.originalname} exceeds maximum size of 25MB`
          });
        }
      }
    }

    // Create work query data WITH reportedBy field
    const workQueryData = {
      title,
      description,
      serviceId,
      priority,
      category,
      reportedBy: {  // ADD THIS - it's required by the service
        userId: supervisorId,
        name: supervisorName,
        role: 'supervisor'
      },
      supervisorId,
      supervisorName
    };

    console.log('🚀 Calling service with data:', workQueryData);
    const workQuery = await workQueryService.createWorkQuery(workQueryData, files || []);
    
    console.log('✅ Work query created successfully:', workQuery.queryId);
    
    res.status(201).json({
      success: true,
      data: workQuery,
      message: 'Work query created successfully'
    });
  } catch (error: any) {
    console.error('❌ Error creating work query:', error);
    console.error('📋 Error stack:', error.stack);
    
    // Handle specific error types
    if (error.message.includes('Service not found')) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    if (error.message.includes('Cloudinary')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload files to cloud storage'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create work query',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
  // Get all work queries
  async getAllWorkQueries(req: Request, res: Response) {
    try {
      console.log('🔍 Fetching work queries with query params:', req.query);
      
      const {
        search = '',
        status = 'all',
        priority = 'all',
        serviceType = 'all',
        supervisorId,
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filters = {
        search: search as string,
        status: status as string,
        priority: priority as string,
        serviceType: serviceType as string,
        supervisorId: supervisorId as string,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      console.log('📋 Filters applied:', filters);

      const result = await workQueryService.getWorkQueriesForUser(
        filters.supervisorId || '',
        'supervisor',
        filters
      );
      
      console.log(`✅ Found ${result.queries.length} queries out of ${result.total}`);
      
      res.status(200).json({
        success: true,
        data: result.queries,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching work queries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work queries',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get work query by ID
  async getWorkQueryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }

      console.log(`🔍 Fetching work query by ID: ${id}`);
      
      const query = await workQueryService.getWorkQueryById(id);
      
      if (!query) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: query
      });
    } catch (error: any) {
      console.error('❌ Error fetching work query by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work query'
      });
    }
  }

  // Get work query by queryId
  async getWorkQueryByQueryId(req: Request, res: Response) {
    try {
      const { queryId } = req.params;
      
      if (!queryId) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }

      console.log(`🔍 Fetching work query by queryId: ${queryId}`);
      
      const query = await workQueryService.getWorkQueryByQueryId(queryId);
      
      if (!query) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: query
      });
    } catch (error: any) {
      console.error('❌ Error fetching work query by queryId:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work query'
      });
    }
  }

  // Update work query status
  async updateWorkQueryStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, superadminResponse } = req.body;
      
      console.log(`🔄 Updating work query ${id} status to ${status}`);
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }
      
      if (!status || !['pending', 'in-progress', 'resolved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Valid status is required (pending, in-progress, resolved, rejected)'
        });
      }
      
      if (status === 'resolved' && !superadminResponse) {
        return res.status(400).json({
          success: false,
          message: 'Superadmin response is required when resolving a query'
        });
      }

      const query = await workQueryService.updateQueryStatus(
        id,
        status,
        superadminResponse
      );
      
      if (!query) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }
      
      console.log(`✅ Work query ${id} status updated successfully`);
      
      res.status(200).json({
        success: true,
        data: query,
        message: `Work query status updated to ${status}`
      });
    } catch (error: any) {
      console.error('❌ Error updating work query status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update work query status'
      });
    }
  }

  // Delete work query
 // Update the deleteWorkQuery method in your controller:

// Delete work query
async deleteWorkQuery(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Query ID is required'
      });
    }

    console.log(`🗑️ Deleting work query: ${id}`);
    
    // First, get the query to check status
    const query = await workQueryService.getWorkQueryById(id);
    
    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Work query not found'
      });
    }

    // Optional: Add validation for deletion
    if (query.status === 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a query that is in progress'
      });
    }

    if (query.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a resolved query'
      });
    }

    // Perform deletion
    const deletedQuery = await workQueryService.deleteWorkQuery(id);
    
    console.log(`✅ Work query ${id} deleted successfully`);
    
    res.status(200).json({
      success: true,
      message: 'Work query deleted successfully',
      data: deletedQuery
    });
  } catch (error: any) {
    console.error('❌ Error deleting work query:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete work query'
    });
  }
}
  // Get statistics
  async getStatistics(req: Request, res: Response) {
    try {
      const { supervisorId } = req.query;
      
      if (!supervisorId) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor ID is required'
        });
      }

      console.log(`📊 Getting statistics for supervisor: ${supervisorId}`);
      
      const statistics = await workQueryService.getStatistics(
        supervisorId as string,
        'supervisor'
      );
      
      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('❌ Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }

  // Get services for supervisor
  async getServicesForSupervisor(req: Request, res: Response) {
    try {
      const { supervisorId } = req.params;
      
      if (!supervisorId) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor ID is required'
        });
      }

      console.log(`🔍 Getting services for supervisor: ${supervisorId}`);
      
      const services = await facilityServiceService.getServicesBySupervisor(supervisorId);
      
      res.status(200).json({
        success: true,
        data: services
      });
    } catch (error: any) {
      console.error('❌ Error fetching services for supervisor:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch services'
      });
    }
  }

  // Add files to existing work query
  async addFilesToWorkQuery(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files provided'
        });
      }

      console.log(`📎 Adding ${files.length} files to work query: ${id}`);
      
      const updatedQuery = await workQueryService.addFilesToWorkQuery(id, files);

      if (!updatedQuery) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }

      res.status(200).json({
        success: true,
        data: updatedQuery,
        message: 'Files added successfully'
      });
    } catch (error: any) {
      console.error('❌ Error adding files to work query:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add files to work query'
      });
    }
  }

  // Remove files from work query
  async removeFilesFromWorkQuery(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { filePublicIds } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }

      if (!filePublicIds || !Array.isArray(filePublicIds) || filePublicIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File public IDs are required as an array'
        });
      }

      console.log(`🗑️ Removing ${filePublicIds.length} files from work query: ${id}`);
      
      const updatedQuery = await workQueryService.removeFilesFromWorkQuery(id, filePublicIds);

      if (!updatedQuery) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }

      res.status(200).json({
        success: true,
        data: updatedQuery,
        message: 'Files removed successfully'
      });
    } catch (error: any) {
      console.error('❌ Error removing files from work query:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove files from work query'
      });
    }
  }

  // Get categories
  async getCategories(req: Request, res: Response) {
    const categories = [
      {
        value: "service-quality",
        label: "Service Quality Issue",
        description: "Issues with the quality of service provided"
      },
      {
        value: "service-delay",
        label: "Service Delay",
        description: "Services not completed on time"
      },
      {
        value: "safety-issue",
        label: "Safety Issue",
        description: "Safety concerns or violations"
      },
      {
        value: "equipment-failure",
        label: "Equipment Failure",
        description: "Equipment not working properly"
      },
      {
        value: "staff-behavior",
        label: "Staff Behavior",
        description: "Issues with staff conduct or behavior"
      },
      {
        value: "cleanliness",
        label: "Cleanliness Issue",
        description: "Poor cleaning or maintenance"
      },
      {
        value: "communication",
        label: "Communication Issue",
        description: "Poor communication from service staff"
      },
      {
        value: "other",
        label: "Other",
        description: "Other types of issues"
      }
    ];

    res.status(200).json({
      success: true,
      data: categories
    });
  }

  // Get priorities
  async getPriorities(req: Request, res: Response) {
    const priorities = [
      {
        value: "low",
        label: "Low Priority",
        description: "Minor issue, can be addressed later",
        color: "green"
      },
      {
        value: "medium",
        label: "Medium Priority",
        description: "Standard issue, address within 24-48 hours",
        color: "yellow"
      },
      {
        value: "high",
        label: "High Priority",
        description: "Urgent issue, address within 24 hours",
        color: "orange"
      },
      {
        value: "critical",
        label: "Critical Priority",
        description: "Critical issue, address immediately",
        color: "red"
      }
    ];

    res.status(200).json({
      success: true,
      data: priorities
    });
  }

  // Get statuses
  async getStatuses(req: Request, res: Response) {
    const statuses = [
      {
        value: "pending",
        label: "Pending",
        description: "Query submitted, awaiting review",
        color: "yellow"
      },
      {
        value: "in-progress",
        label: "In Progress",
        description: "Query is being investigated",
        color: "blue"
      },
      {
        value: "resolved",
        label: "Resolved",
        description: "Query has been resolved",
        color: "green"
      },
      {
        value: "rejected",
        label: "Rejected",
        description: "Query was rejected",
        color: "red"
      }
    ];

    res.status(200).json({
      success: true,
      data: statuses
    });
  }

  // Get recent work queries for dashboard
  async getRecentWorkQueries(req: Request, res: Response) {
    try {
      const { supervisorId, limit = '5' } = req.query;
      
      if (!supervisorId) {
        return res.status(400).json({
          success: false,
          message: 'Supervisor ID is required'
        });
      }

      const filters = {
        supervisorId: supervisorId as string,
        limit: parseInt(limit as string, 10),
        page: 1
      };
      
      const result = await workQueryService.getWorkQueriesForUser(
        supervisorId as string,
        'supervisor',
        filters
      );
      
      res.status(200).json({
        success: true,
        data: result.queries
      });
    } catch (error: any) {
      console.error('❌ Error fetching recent work queries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent work queries'
      });
    }
  }

  // Add comment to work query
  async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId, name, comment } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }
      
      if (!userId || !name || !comment) {
        return res.status(400).json({
          success: false,
          message: 'User ID, name, and comment are required'
        });
      }

      console.log(`💬 Adding comment to work query: ${id}`);
      
      const updatedQuery = await workQueryService.addComment(id, {
        userId,
        name,
        comment
      });

      if (!updatedQuery) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }

      res.status(200).json({
        success: true,
        data: updatedQuery,
        message: 'Comment added successfully'
      });
    } catch (error: any) {
      console.error('❌ Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add comment'
      });
    }
  }

  // Assign work query
  async assignQuery(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId, name, role = 'staff' } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Query ID is required'
        });
      }
      
      if (!userId || !name) {
        return res.status(400).json({
          success: false,
          message: 'User ID and name are required'
        });
      }

      console.log(`👤 Assigning work query ${id} to ${name}`);
      
      const updatedQuery = await workQueryService.assignQuery(id, {
        userId,
        name,
        role
      });

      if (!updatedQuery) {
        return res.status(404).json({
          success: false,
          message: 'Work query not found'
        });
      }

      res.status(200).json({
        success: true,
        data: updatedQuery,
        message: 'Query assigned successfully'
      });
    } catch (error: any) {
      console.error('❌ Error assigning query:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign query'
      });
    }
  }

  // Get service types
  async getServiceTypes(req: Request, res: Response) {
    const serviceTypes = [
      {
        value: "cleaning",
        label: "Cleaning Service",
        icon: "sparkles",
        color: "blue"
      },
      {
        value: "waste-management",
        label: "Waste Management",
        icon: "trash-2",
        color: "green"
      },
      {
        value: "parking-management",
        label: "Parking Management",
        icon: "car",
        color: "purple"
      },
      {
        value: "security",
        label: "Security Service",
        icon: "shield",
        color: "orange"
      },
      {
        value: "maintenance",
        label: "Maintenance",
        icon: "wrench",
        color: "red"
      }
    ];

    res.status(200).json({
      success: true,
      data: serviceTypes
    });
  }
}

export const workQueryController = new WorkQueryController();