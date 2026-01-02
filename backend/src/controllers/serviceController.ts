import { Request, Response } from 'express';
import Service, { IService } from '../models/Service';

// Get all services
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: services,
      count: services.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching services'
    });
  }
};

// Get single service
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching service'
    });
  }
};

// Create new service
export const createService = async (req: Request, res: Response) => {
  try {
    const {
      name,
      status = 'operational',
      assignedTeam,
      description,
      category = 'application',
      uptime = 99.9,
      responseTime = 100
    } = req.body;

    const newService = new Service({
      name,
      status,
      assignedTeam,
      lastChecked: new Date(),
      description,
      category,
      uptime,
      responseTime
    });

    await newService.save();

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: newService
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating service'
    });
  }
};

// Update service status
export const updateServiceStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    
    if (!['operational', 'maintenance', 'down'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        lastChecked: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service status updated successfully',
      data: service
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating service status'
    });
  }
};

// Update service
export const updateService = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    if (updates.status && !['operational', 'maintenance', 'down'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { 
        ...updates,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating service'
    });
  }
};

// Delete service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting service'
    });
  }
};

// Get service statistics
export const getServiceStats = async (req: Request, res: Response) => {
  try {
    const stats = await Service.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalServices = await Service.countDocuments();
    const operationalServices = await Service.countDocuments({ status: 'operational' });
    const uptimePercentage = totalServices > 0 ? (operationalServices / totalServices) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        stats,
        total: totalServices,
        operational: operationalServices,
        uptimePercentage: uptimePercentage.toFixed(2),
        lastUpdated: new Date()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching service statistics'
    });
  }
};

// Seed initial services (for development)
export const seedServices = async (req: Request, res: Response) => {
  try {
    const initialServices = [
      {
        name: 'API Gateway',
        status: 'operational',
        assignedTeam: 'Backend Team',
        description: 'Main API gateway service',
        category: 'api',
        uptime: 99.9,
        responseTime: 50
      },
      {
        name: 'Database Server',
        status: 'operational',
        assignedTeam: 'Database Team',
        description: 'Primary database server',
        category: 'database',
        uptime: 99.8,
        responseTime: 20
      },
      {
        name: 'Authentication Service',
        status: 'operational',
        assignedTeam: 'Security Team',
        description: 'User authentication and authorization',
        category: 'api',
        uptime: 99.9,
        responseTime: 30
      },
      {
        name: 'Payment Gateway',
        status: 'maintenance',
        assignedTeam: 'Payment Team',
        description: 'Payment processing service',
        category: 'application',
        uptime: 99.5,
        responseTime: 100
      },
      {
        name: 'Email Service',
        status: 'operational',
        assignedTeam: 'Infrastructure Team',
        description: 'Email notification service',
        category: 'application',
        uptime: 99.7,
        responseTime: 200
      },
      {
        name: 'File Storage',
        status: 'operational',
        assignedTeam: 'Storage Team',
        description: 'File upload and storage service',
        category: 'server',
        uptime: 99.6,
        responseTime: 80
      }
    ];

    // Clear existing services
    await Service.deleteMany({});
    
    // Insert new services
    const services = await Service.insertMany(initialServices);

    res.status(201).json({
      success: true,
      message: 'Services seeded successfully',
      data: services,
      count: services.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error seeding services'
    });
  }
};