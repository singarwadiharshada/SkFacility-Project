import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Alert, { IAlert } from '../models/Alert';

// Get all alerts
export const getAllAlerts = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('📋 Fetching all alerts from database....');
    const alerts: IAlert[] = await Alert.find().sort({ createdAt: -1 });
    
    console.log(`✅ Found ${alerts.length} alerts`);
    
    return res.status(200).json({
      success: true,
      data: alerts,
      total: alerts.length
    });
  } catch (error: any) {
    console.error('❌ Error fetching alerts:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alerts',
      error: error.message 
    });
  }
};

// Get single alert
export const getAlert = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    console.log(`🔍 Fetching alert with ID: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid alert ID format' 
      });
    }
    
    const alert: IAlert | null = await Alert.findById(id);
    
    if (!alert) {
      return res.status(404).json({ 
        success: false, 
        message: 'Alert not found' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      data: alert 
    });
  } catch (error: any) {
    console.error('❌ Error fetching alert:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch alert',
      error: error.message 
    });
  }
};

// Create alert
export const createAlert = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('➕ Creating new alert:', req.body);
    
    const { title, description, severity, site, reportedBy, assignedTo, date, photos } = req.body;
    
    // Validation
    if (!title || !description || !severity || !site || !reportedBy || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, severity, site, reportedBy, date'
      });
    }
    
    const newAlert: IAlert = new Alert({
      title,
      description,
      severity,
      site,
      reportedBy,
      assignedTo: assignedTo || '',
      date,
      photos: photos || []
    });
    
    const savedAlert: IAlert = await newAlert.save();
    
    console.log('✅ Alert created successfully with ID:', savedAlert._id);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Alert created successfully', 
      data: savedAlert 
    });
  } catch (error: any) {
    console.error('❌ Error creating alert:', error);
    return res.status(400).json({ 
      success: false, 
      message: 'Failed to create alert',
      error: error.message 
    });
  }
};

// Update alert
export const updateAlert = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    console.log(`✏️ Updating alert ${id}:`, req.body);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert ID format'
      });
    }
    
    const alert: IAlert | null = await Alert.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    console.log('✅ Alert updated successfully:', id);
    
    return res.status(200).json({
      success: true,
      message: 'Alert updated successfully',
      data: alert
    });
  } catch (error: any) {
    console.error('❌ Error updating alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
};

// Update alert status
export const updateAlertStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Updating alert ${id} status to:`, status);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert ID'
      });
    }
    
    const validStatuses = ['open', 'in-progress', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const alert: IAlert | null = await Alert.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Alert status updated',
      data: alert
    });
  } catch (error: any) {
    console.error('❌ Error updating alert status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// Delete alert
export const deleteAlert = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting alert: ${id}`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alert ID'
      });
    }
    
    const alert: IAlert | null = await Alert.findByIdAndDelete(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    console.log('✅ Alert deleted successfully:', id);
    
    return res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ Error deleting alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
};

// Get alert statistics
export const getAlertStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    console.log('📊 Fetching alert statistics...');
    
    const alerts: IAlert[] = await Alert.find();
    
    const stats = {
      total: alerts.length,
      open: alerts.filter(a => a.status === 'open').length,
      inProgress: alerts.filter(a => a.status === 'in-progress').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      low: alerts.filter(a => a.severity === 'low').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      high: alerts.filter(a => a.severity === 'high').length,
      critical: alerts.filter(a => a.severity === 'critical').length
    };
    
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error fetching statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};
