import { Request, Response } from 'express';
import Client from '../models/Client';

// Get all clients
export const getClients = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    const query = search 
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};
    
    const clients = await Client.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: clients
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching clients'
    });
  }
};

// Create client
export const createClient = async (req: Request, res: Response) => {
  try {
    const client = await Client.create(req.body);
    
    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating client'
    });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: client,
      message: 'Client updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating client'
    });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const client = await Client.findByIdAndDelete(id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting client'
    });
  }
};