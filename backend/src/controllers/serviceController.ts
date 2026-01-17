// controllers/serviceController.ts
import { Request, Response } from 'express';
import Service, { IService } from '../models/Service';

// Get all services for a specific role
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const { role } = req.query; // Get role from query params
    
    let query: any = {};
    
    // Filter services based on role
    if (role && role !== 'superadmin') {
      // For non-superadmin roles, show services that are:
      // 1. Visible to all (isVisibleToAll: true) OR
      // 2. Shared with their specific role OR
      // 3. Created by them
      query.$or = [
        { isVisibleToAll: true },
        { sharedWithRoles: role },
        { visibility: 'all' },
        { createdByRole: role }
      ];
    }
    // For superadmin, show all services
    
    const services = await Service.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: services,
      total: services.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching services'
    });
  }
};

// Get services by creator role
export const getServicesByCreatorRole = async (req: Request, res: Response) => {
  try {
    const { createdByRole } = req.query;
    
    if (!createdByRole) {
      return res.status(400).json({
        success: false,
        message: 'createdByRole parameter is required'
      });
    }
    
    const services = await Service.find({ createdByRole }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: services,
      total: services.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching services by creator role'
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
      createdBy,
      createdByRole = 'superadmin',
      isVisibleToAll = true,
      sharedWithRoles = [],
      visibility = 'all',
      createdByUserId
    } = req.body;

    // Check if service with same name exists
    const existingService = await Service.findOne({ name });
    
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Service with this name already exists'
      });
    }

    // Auto-share between superadmin and admin
    let finalSharedRoles = [...sharedWithRoles];
    if (createdByRole === 'superadmin' && !finalSharedRoles.includes('admin')) {
      finalSharedRoles.push('admin');
    } else if (createdByRole === 'admin' && !finalSharedRoles.includes('superadmin')) {
      finalSharedRoles.push('superadmin');
    }

    const newService = new Service({
      name,
      status,
      assignedTeam,
      lastChecked: new Date(),
      description,
      createdBy,
      createdByRole,
      createdByUserId,
      isVisibleToAll,
      sharedWithRoles: finalSharedRoles,
      visibility
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
    const { status, updatedBy, updatedByRole } = req.body;
    
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
        updatedBy,
        updatedByRole,
        updatedAt: new Date()
      },
      { new: true }
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

// Update service visibility (auto-share between superadmin and admin)
export const updateServiceVisibility = async (req: Request, res: Response) => {
  try {
    const { isVisibleToAll, sharedWithRoles, visibility } = req.body;
    
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Auto-share between superadmin and admin
    let updatedSharedRoles = sharedWithRoles || [];
    if (service.createdByRole === 'superadmin') {
      if (!updatedSharedRoles.includes('admin')) {
        updatedSharedRoles.push('admin');
      }
    } else if (service.createdByRole === 'admin') {
      if (!updatedSharedRoles.includes('superadmin')) {
        updatedSharedRoles.push('superadmin');
      }
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { 
        isVisibleToAll,
        sharedWithRoles: updatedSharedRoles,
        visibility,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Service visibility updated successfully',
      data: updatedService
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating service visibility'
    });
  }
};

// Delete service (Admin only - superadmin cannot delete)
export const deleteService = async (req: Request, res: Response) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Only allow deletion if service was created by admin
    // Superadmin services cannot be deleted
    if (service.createdByRole === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete services created by superadmin'
      });
    }

    // Delete the service
    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error deleting service'
    });
  }
};

// Get service by ID
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
    res.status(400).json({
      success: false,
      message: error.message || 'Error fetching service'
    });
  }
};

// Get services shared between superadmin and admin
export const getSharedServices = async (req: Request, res: Response) => {
  try {
    const services = await Service.find({
      $or: [
        { createdByRole: 'superadmin' },
        { createdByRole: 'admin' }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: services,
      total: services.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching shared services'
    });
  }
};