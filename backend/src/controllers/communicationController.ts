import { Request, Response } from 'express';
import Communication from '../models/Communication';

// Get all communications
export const getCommunications = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    const query = search 
      ? {
          $or: [
            { clientName: { $regex: search, $options: 'i' } },
            { notes: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    
    const communications = await Communication.find(query)
      .sort({ date: -1 })
      .populate('clientId', 'name company email');
    
    res.status(200).json({
      success: true,
      data: communications
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching communications'
    });
  }
};

// Create communication
export const createCommunication = async (req: Request, res: Response) => {
  try {
    const communication = await Communication.create(req.body);
    
    res.status(201).json({
      success: true,
      data: communication,
      message: 'Communication logged successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating communication'
    });
  }
};

// Delete communication
export const deleteCommunication = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const communication = await Communication.findByIdAndDelete(id);
    
    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Communication deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting communication'
    });
  }
};